import assert from "node:assert/strict"
import test from "node:test"
import { mergeSession, isSessionExpired } from "./auth-session.mjs"

test("mergeSession puts the login token on an organization /api/me body", () => {
  const me = { type: "ORGANIZATION", id: 7, email: "o@x.com", organizationName: "Org", country: "PE", city: "Lima", role: "ORGANIZATION" }
  const out = mergeSession(me, { token: "jwt-org", tokenType: "Bearer", expiresIn: 86400, role: "ORGANIZATION" })
  assert.deepEqual(out, { ...me, token: "jwt-org" })
})

test("mergeSession keeps the doctor profile body and adds the token", () => {
  const me = { profile: { id: 3, specialization: "Onco", licenseNumber: "L1" } }
  const out = mergeSession(me, { token: "jwt-doc" })
  assert.deepEqual(out, { profile: me.profile, token: "jwt-doc" })
})

test("mergeSession ignores any token carried by /api/me and does not mutate inputs", () => {
  const me = { type: "ORGANIZATION", id: 1, token: "stale" }
  const out = mergeSession(me, { token: "fresh" })
  assert.equal(out.token, "fresh")
  assert.equal(me.token, "stale")
})

test("mergeSession rejects a login body without token", () => {
  assert.throws(() => mergeSession({ id: 1 }, { role: "DOCTOR" }), /token/)
})

test("isSessionExpired is true for 401 on authenticated endpoints", () => {
  assert.equal(isSessionExpired(401, "/api/dashboard/doctor/3"), true)
  assert.equal(isSessionExpired(401, "/api/me"), true)
})

test("isSessionExpired is false for 401 on login/org registration and for other statuses", () => {
  assert.equal(isSessionExpired(401, "/api/auth/login"), false)
  assert.equal(isSessionExpired(403, "/api/dashboard/doctor/3"), false)
  assert.equal(isSessionExpired(404, "/api/me"), false)
  assert.equal(isSessionExpired(200, "/api/me"), false)
})
