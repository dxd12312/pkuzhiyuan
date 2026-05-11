import cloudbase from "@cloudbase/node-sdk";

let app: ReturnType<typeof cloudbase.init> | null = null;

export function getCloudBaseApp() {
  if (app) return app;

  const envId = process.env.CLOUDBASE_ENV_ID;
  const secretId = process.env.TENCENTCLOUD_SECRETID ?? process.env.TENCENTCLOUND_SECRETID ?? process.env.TENXUNCLOUD_SECRETID;
  const secretKey = process.env.TENCENTCLOUD_SECRETKEY ?? process.env.TENCENTCLOUND_SECRETKEY ?? process.env.TENXUNCLOUD_SECRETKEY;

  if (!envId || !secretId || !secretKey) {
    throw new Error("CloudBase environment variables not configured");
  }

  app = cloudbase.init({
    env: envId,
    secretId,
    secretKey,
  });

  return app;
}

export function getDb() {
  return getCloudBaseApp().database();
}
