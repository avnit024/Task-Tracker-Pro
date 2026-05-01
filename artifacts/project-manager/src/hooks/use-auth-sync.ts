import { useEffect } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export function useAuthTokenSync() {
  useEffect(() => {
    // Sync the token getter for custom-fetch
    setAuthTokenGetter(() => {
      return localStorage.getItem("auth_token");
    });
  }, []);
}
