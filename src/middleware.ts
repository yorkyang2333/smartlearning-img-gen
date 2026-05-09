import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login");

    if (isAuthPage) {
      if (isAuth) {
        if (token.role === "TEACHER") {
          return NextResponse.redirect(new URL("/teacher/dashboard", req.url));
        } else {
          return NextResponse.redirect(new URL("/student/generate", req.url));
        }
      }
      return null;
    }

    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }

      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      );
    }

    if (req.nextUrl.pathname.startsWith("/teacher") && token.role !== "TEACHER") {
      return NextResponse.redirect(new URL("/student/generate", req.url));
    }

    if (req.nextUrl.pathname.startsWith("/student") && token.role !== "STUDENT") {
      return NextResponse.redirect(new URL("/teacher/dashboard", req.url));
    }
    
    // Redirect root to dashboard based on role
    if (req.nextUrl.pathname === "/") {
       if (token.role === "TEACHER") {
          return NextResponse.redirect(new URL("/teacher/dashboard", req.url));
       } else {
          return NextResponse.redirect(new URL("/student/generate", req.url));
       }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => true, // We handle redirects in the middleware function
    },
  }
);

export const config = {
  matcher: ["/teacher/:path*", "/student/:path*", "/login", "/"],
};
