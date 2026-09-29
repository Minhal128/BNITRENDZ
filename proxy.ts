import { withAuth } from "next-auth/middleware";

// Gate every /admin request, including client-side navigations, on a valid session cookie.
// Admin pages and APIs still re-check the admin against the database (lib/auth.ts).
export default withAuth({ pages: { signIn: "/admin/login" } });

export const config = { matcher: ["/admin/:path*"] };
