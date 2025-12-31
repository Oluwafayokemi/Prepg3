// apps/investor/app/unauthorized/page.jsx
import { UnauthorizedPage } from "../../../shared/pages";

export default function Unauthorized() {
  return <UnauthorizedPage loginLink="/login" homeLink="/dashboard" />;
}
