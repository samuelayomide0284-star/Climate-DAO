(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-PROPOSAL-EXISTS u101)
(define-constant ERR-PROPOSAL-NOT-FOUND u102)
(define-constant ERR-INVALID-QUORUM u103)
(define-constant ERR-INVALID-DURATION u104)
(define-constant ERR-INVALID-AMOUNT u105)
(define-constant ERR-VOTING-ENDED u106)
(define-constant ERR-VOTING-NOT-STARTED u107)
(define-constant ERR-ALREADY-VOTED u108)
(define-constant ERR-INSUFFICIENT-STAKE u109)
(define-constant ERR-INVALID-STATUS u110)
(define-constant ERR-QUORUM-NOT-MET u111)
(define-constant ERR-PROPOSAL-REJECTED u112)
(define-constant ERR-TREASURY-FAIL u113)
(define-constant ERR-STAKING-FAIL u114)
(define-constant ERR-INVALID-TITLE u115)
(define-constant ERR-INVALID-DESC u116)
(define-constant ERR-MAX-PROPOSALS u117)
(define-constant ERR-INVALID-VOTE u118)
(define-constant ERR-NOT-ELIGIBLE u119)
(define-constant ERR-INVALID-START u120)

(define-data-var next-proposal-id uint u0)
(define-data-var quorum-threshold uint u50)
(define-data-var voting-duration uint u1440)
(define-data-var max-proposals uint u1000)
(define-data-var min-stake-required uint u100)
(define-data-var total-staked uint u0)
(define-data-var admin principal tx-sender)
(define-data-var staking-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var treasury-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var proposal-submission-contract principal 'SP000000000000000000002Q6VF78)

(define-map proposals
  uint
  {
    title: (string-utf8 100),
    description: (string-utf8 500),
    proposer: principal,
    funding-amount: uint,
    start-height: uint,
    end-height: uint,
    yes-votes: uint,
    no-votes: uint,
    status: (string-ascii 20),
    executed: bool
  }
)

(define-map votes
  { proposal-id: uint, voter: principal }
  bool
)

(define-map voter-weights
  { proposal-id: uint, voter: principal }
  uint
)

(define-read-only (get-proposal (id uint))
  (map-get? proposals id)
)

(define-read-only (get-vote (id uint) (voter principal))
  (map-get? votes { proposal-id: id, voter: voter })
)

(define-read-only (get-voter-weight (id uint) (voter principal))
  (default-to u0 (map-get? voter-weights { proposal-id: id, voter: voter }))
)

(define-read-only (get-quorum-threshold)
  (ok (var-get quorum-threshold))
)

(define-read-only (get-voting-duration)
  (ok (var-get voting-duration))
)

(define-read-only (get-total-staked)
  (ok (var-get total-staked))
)

(define-private (validate-title (title (string-utf8 100)))
  (if (and (> (len title) u0) (<= (len title) u100))
    (ok true)
    (err ERR-INVALID-TITLE))
)

(define-private (validate-description (desc (string-utf8 500)))
  (if (and (> (len desc) u0) (<= (len desc) u500))
    (ok true)
    (err ERR-INVALID-DESC))
)

(define-private (validate-amount (amount uint))
  (if (> amount u0)
    (ok true)
    (err ERR-INVALID-AMOUNT))
)

(define-private (validate-quorum (quorum uint))
  (if (and (> quorum u0) (<= quorum u100))
    (ok true)
    (err ERR-INVALID-QUORUM))
)

(define-private (validate-duration (duration uint))
  (if (> duration u0)
    (ok true)
    (err ERR-INVALID-DURATION))
)

(define-private (validate-start (start uint))
  (if (>= start block-height)
    (ok true)
    (err ERR-INVALID-START))
)

(define-private (is-eligible-voter (voter principal))
  (let ((stake (as-contract (contract-call? .staking-contract get-staked-amount voter))))
    (if (>= (unwrap! stake (err ERR-STAKING-FAIL)) (var-get min-stake-required))
      (ok true)
      (err ERR-INSUFFICIENT-STAKE)))
)

(define-private (get-stake-weight (voter principal))
  (unwrap! (as-contract (contract-call? .staking-contract get-staked-amount voter)) u0)
)

(define-public (set-quorum-threshold (new-quorum uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-quorum new-quorum))
    (var-set quorum-threshold new-quorum)
    (ok true)
  )
)

(define-public (set-voting-duration (new-duration uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-duration new-duration))
    (var-set voting-duration new-duration)
    (ok true)
  )
)

(define-public (set-min-stake-required (new-min uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-min u0) (err ERR-INSUFFICIENT-STAKE))
    (var-set min-stake-required new-min)
    (ok true)
  )
)

(define-public (create-proposal
  (title (string-utf8 100))
  (description (string-utf8 500))
  (funding-amount uint)
  (start-height uint)
)
  (let ((id (var-get next-proposal-id)))
    (asserts! (is-eq tx-sender (var-get proposal-submission-contract)) (err ERR-NOT-AUTHORIZED))
    (asserts! (< id (var-get max-proposals)) (err ERR-MAX-PROPOSALS))
    (try! (validate-title title))
    (try! (validate-description description))
    (try! (validate-amount funding-amount))
    (try! (validate-start start-height))
    (map-set proposals id
      {
        title: title,
        description: description,
        proposer: tx-sender,
        funding-amount: funding-amount,
        start-height: start-height,
        end-height: (+ start-height (var-get voting-duration)),
        yes-votes: u0,
        no-votes: u0,
        status: "active",
        executed: false
      }
    )
    (var-set next-proposal-id (+ id u1))
    (print { event: "proposal-created", id: id })
    (ok id)
  )
)

(define-public (vote (proposal-id uint) (vote-yes bool))
  (let ((proposal (unwrap! (map-get? proposals proposal-id) (err ERR-PROPOSAL-NOT-FOUND)))
        (weight (get-stake-weight tx-sender)))
    (try! (is-eligible-voter tx-sender))
    (asserts! (>= block-height (get start-height proposal)) (err ERR-VOTING-NOT-STARTED))
    (asserts! (< block-height (get end-height proposal)) (err ERR-VOTING-ENDED))
    (asserts! (is-none (map-get? votes { proposal-id: proposal-id, voter: tx-sender })) (err ERR-ALREADY-VOTED))
    (if vote-yes
      (map-set proposals proposal-id (merge proposal { yes-votes: (+ (get yes-votes proposal) weight) }))
      (map-set proposals proposal-id (merge proposal { no-votes: (+ (get no-votes proposal) weight) })))
    (map-set votes { proposal-id: proposal-id, voter: tx-sender } vote-yes)
    (map-set voter-weights { proposal-id: proposal-id, voter: tx-sender } weight)
    (print { event: "vote-cast", proposal-id: proposal-id, voter: tx-sender, yes: vote-yes, weight: weight })
    (ok true)
  )
)

(define-public (end-voting (proposal-id uint))
  (let ((proposal (unwrap! (map-get? proposals proposal-id) (err ERR-PROPOSAL-NOT-FOUND)))
        (total-votes (+ (get yes-votes proposal) (get no-votes proposal))))
    (asserts! (>= block-height (get end-height proposal)) (err ERR-VOTING-ENDED))
    (asserts! (not (get executed proposal)) (err ERR-INVALID-STATUS))
    (if (>= total-votes (* (var-get total-staked) (var-get quorum-threshold) / u100))
      (if (> (get yes-votes proposal) (get no-votes proposal))
        (begin
          (map-set proposals proposal-id (merge proposal { status: "passed", executed: true }))
          (try! (as-contract (contract-call? .treasury-contract release-funds (get proposer proposal) (get funding-amount proposal))))
          (print { event: "proposal-passed", id: proposal-id })
          (ok true)
        )
        (begin
          (map-set proposals proposal-id (merge proposal { status: "rejected", executed: true }))
          (print { event: "proposal-rejected", id: proposal-id })
          (err ERR-PROPOSAL-REJECTED)
        )
      )
      (begin
        (map-set proposals proposal-id (merge proposal { status: "failed-quorum", executed: true }))
        (print { event: "quorum-not-met", id: proposal-id })
        (err ERR-QUORUM-NOT-MET)
      )
    )
  )
)

(define-public (update-total-staked (new-total uint))
  (begin
    (asserts! (is-eq tx-sender (var-get staking-contract)) (err ERR-NOT-AUTHORIZED))
    (var-set total-staked new-total)
    (ok true)
  )
)

(define-public (get-proposal-count)
  (ok (var-get next-proposal-id))
)

(define-public (is-voting-active (id uint))
  (let ((proposal (map-get? proposals id)))
    (match proposal p
      (ok (and (>= block-height (get start-height p)) (< block-height (get end-height p))))
      (err ERR-PROPOSAL-NOT-FOUND)
    )
  )
)