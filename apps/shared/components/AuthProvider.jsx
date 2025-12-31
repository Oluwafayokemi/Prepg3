// apps/shared/components/AuthProvider.jsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";

export default function AuthProvider({
  children,
  requiredGroup = null,
  loginPath = "/login",
  publicPaths = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/unauthorized",
  ],
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    // Skip auth check for public paths
    if (publicPaths.includes(pathname)) {
      setAuthorized(true);
      setLoading(false);
      return;
    }

    try {
      const user = await getCurrentUser();

      if (requiredGroup) {
        console.log("User", user);
        const groups =
          user.signInUserSession?.accessToken?.payload?.["cognito:groups"] ||
          [];
        if (!groups.includes(requiredGroup)) {
          router.push("/unauthorized");
          return;
        }
      }

      setAuthorized(true);
    } catch (error) {
      router.push(loginPath);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "2rem",
              marginBottom: "1rem",
            }}
          >
            ⏳
          </div>
          <p style={{ color: "#6b7280" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return authorized ? children : null;
}
