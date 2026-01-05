// apps/shared/lib/graphql-client.ts

import { generateClient } from "aws-amplify/api";
import { fetchAuthSession } from "aws-amplify/auth";

export const createAuthenticatedClient = () => {
  return generateClient({
    authMode: "userPool",
    headers: async () => {
      const session = await fetchAuthSession();

      const accessToken = session.tokens?.accessToken?.toString();
      const idToken = session.tokens?.idToken;

      if (!accessToken) {
        throw new Error("No access token available");
      }

      // 👇 You can read email from ID token
      const email = idToken?.payload?.email;

      console.log("👤 Auth user", {
        email,
        sub: idToken?.payload?.sub,
      });

      return {
        Authorization: accessToken,
      };
    },
  });
};
