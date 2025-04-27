;; Vehicle Registration Contract
;; Records details of self-driving assets

(define-data-var last-vehicle-id uint u0)

;; Vehicle status: 1=active, 2=maintenance, 3=inactive
(define-map vehicles
  { vehicle-id: uint }
  {
    owner: principal,
    model: (string-utf8 64),
    manufacture-year: uint,
    registration-date: uint,
    status: uint
  }
)

(define-read-only (get-vehicle (vehicle-id uint))
  (map-get? vehicles { vehicle-id: vehicle-id })
)

(define-read-only (get-vehicle-status (vehicle-id uint))
  (default-to u0 (get status (map-get? vehicles { vehicle-id: vehicle-id })))
)

(define-public (register-vehicle (model (string-utf8 64)) (manufacture-year uint))
  (let
    (
      (new-id (+ (var-get last-vehicle-id) u1))
    )
    (asserts! (> manufacture-year u2000) (err u1)) ;; Basic validation
    (var-set last-vehicle-id new-id)
    (map-set vehicles
      { vehicle-id: new-id }
      {
        owner: tx-sender,
        model: model,
        manufacture-year: manufacture-year,
        registration-date: block-height,
        status: u1
      }
    )
    (ok new-id)
  )
)

(define-public (update-vehicle-status (vehicle-id uint) (new-status uint))
  (let
    (
      (vehicle (map-get? vehicles { vehicle-id: vehicle-id }))
    )
    (asserts! (is-some vehicle) (err u2)) ;; Vehicle must exist
    (asserts! (is-eq (get owner (unwrap-panic vehicle)) tx-sender) (err u3)) ;; Only owner can update
    (asserts! (and (>= new-status u1) (<= new-status u3)) (err u4)) ;; Valid status values

    (map-set vehicles
      { vehicle-id: vehicle-id }
      (merge (unwrap-panic vehicle) { status: new-status })
    )
    (ok true)
  )
)

(define-public (transfer-vehicle (vehicle-id uint) (new-owner principal))
  (let
    (
      (vehicle (map-get? vehicles { vehicle-id: vehicle-id }))
    )
    (asserts! (is-some vehicle) (err u2)) ;; Vehicle must exist
    (asserts! (is-eq (get owner (unwrap-panic vehicle)) tx-sender) (err u3)) ;; Only owner can transfer

    (map-set vehicles
      { vehicle-id: vehicle-id }
      (merge (unwrap-panic vehicle) { owner: new-owner })
    )
    (ok true)
  )
)
