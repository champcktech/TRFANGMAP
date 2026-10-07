# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default Deny**: All unmatched paths (`/{document=**}`) are strictly denied (`allow read, write: if false;`).
2. **Verified Authentication**: All reads and writes to `/sheets/{sheetId}` require an authenticated user with `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Path ID Hardening**: `sheetId` must match `^[a-zA-Z0-9_\-]+$` and have length `>= 1` and `<= 128`.
4. **Strict Key & Schema Enforcement (`isValidSheet`)**:
   - Exact keys enforced via `hasAll` and `hasOnly`.
   - String length bounds enforced on `sheetNo` (`1..32`), `title` (`1..200`), `feederCode` (`0..64`), `substation` (`0..200`), `description` (`0..500`), and `ownerId` (`1..128`).
   - List bounds enforced on `transformers` (`<= 300`), `switches` (`<= 200`), `feederPaths` (`<= 200`), and `annotations` (`<= 200`), with element type checks (`size() == 0 || list[0] is map`).
5. **Identity & Immutability**:
   - `ownerId` must equal `request.auth.uid` on create and remain immutable (`incoming().ownerId == existing().ownerId`) on update.
   - `createdAt` must equal `request.time` on create and remain immutable (`incoming().createdAt == existing().createdAt`) on update.
   - `updatedAt` must equal `request.time` on both create and update.
6. **Query Enforcement**: `list` operations on `/sheets` require `resource.data.ownerId == request.auth.uid`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `request.auth == null` -> `PERMISSION_DENIED`
2. **Unverified Email Spoof**: `request.auth.token.email_verified == false` -> `PERMISSION_DENIED`
3. **Shadow/Ghost Field Injection**: Payload includes `isAdmin: true` -> `PERMISSION_DENIED` (blocked by `hasOnly`)
4. **Identity Spoofing on Create**: `ownerId: "victim-uid"` when `request.auth.uid == "attacker-uid"` -> `PERMISSION_DENIED`
5. **Owner Hijack on Update**: Changing `ownerId` during update -> `PERMISSION_DENIED`
6. **Immutable Timestamp Tampering**: Modifying `createdAt` during update -> `PERMISSION_DENIED`
7. **Forged Client Timestamp**: `updatedAt` not equal to `request.time` -> `PERMISSION_DENIED`
8. **ID Poisoning Attack**: `sheetId` containing special characters or `> 128` chars -> `PERMISSION_DENIED`
9. **Oversized String DoW Attack**: `title` exceeding 200 characters -> `PERMISSION_DENIED`
10. **Unbounded Array DoW Attack**: `transformers` list exceeding 300 elements -> `PERMISSION_DENIED`
11. **Array Type Poisoning**: `transformers: ["not-a-map"]` -> `PERMISSION_DENIED`
12. **Unauthorized Cross-Tenant Read/List**: Querying `/sheets` without `where('ownerId', '==', request.auth.uid)` -> `PERMISSION_DENIED`
