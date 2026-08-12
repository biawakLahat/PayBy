import test from "node:test";
import assert from "node:assert/strict";
import { parseRoute, routeToPath, type AppRoute } from "../src/app/router";

test("parses landing and workspace routes", () => {
  const cases: Array<[string, AppRoute]> = [
    ["/", { name: "landing" }],
    ["/app", { name: "vault" }],
    ["/app/vault", { name: "vault" }],
    ["/app/publish?draft=1", { name: "publish" }],
    ["/app/analytics", { name: "analytics" }],
    ["/app/discover", { name: "discover" }],
    ["/app/library", { name: "library" }],
    ["/app/network", { name: "network" }],
    ["/app/profile", { name: "profile" }],
    ["/app/activity", { name: "activity" }],
  ];

  for (const [pathname, expected] of cases) {
    assert.deepEqual(parseRoute(pathname), expected, pathname);
  }
});

test("parses public creator, share, and media detail routes", () => {
  assert.deepEqual(parseRoute("/creator/0xabc%2Fcreator"), {
    name: "creator",
    owner: "0xabc/creator",
  });
  assert.deepEqual(parseRoute("/media/0xabc/folder/lesson%20one.mp4"), {
    name: "share",
    owner: "0xabc",
    blobName: "folder/lesson one.mp4",
  });
  assert.deepEqual(parseRoute("/app/blob/0xabc/folder/lesson%20one.mp4"), {
    name: "detail",
    owner: "0xabc",
    blobName: "folder/lesson one.mp4",
  });
});

test("serializes stable workspace and public paths", () => {
  assert.equal(routeToPath({ name: "vault" }), "/app/vault");
  assert.equal(routeToPath({ name: "publish" }), "/app/publish");
  assert.equal(
    routeToPath({
      name: "detail",
      owner: "0xabc/creator",
      blobName: "folder/lesson one.mp4",
    }),
    "/app/blob/0xabc%2Fcreator/folder/lesson%20one.mp4",
  );
  assert.equal(
    routeToPath({
      name: "share",
      owner: "0xabc",
      blobName: "folder/lesson one.mp4",
    }),
    "/media/0xabc/folder/lesson%20one.mp4",
  );
  assert.equal(
    routeToPath({ name: "creator", owner: "0xabc/creator" }),
    "/creator/0xabc%2Fcreator",
  );
});

test("route serialization round-trips supported parameterized routes", () => {
  const routes: AppRoute[] = [
    { name: "detail", owner: "0xabc", blobName: "archive/clip one.zip" },
    { name: "share", owner: "0xabc", blobName: "archive/clip one.zip" },
    { name: "creator", owner: "0xabc" },
  ];

  assert.deepEqual(
    routes.map((route) => parseRoute(routeToPath(route))),
    routes,
  );
});
