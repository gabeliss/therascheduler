import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Only protect dashboard routes
  if (!req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // Check if we're coming from the login page to avoid redirect loops
  const referer = req.headers.get('referer') || '';
  if (referer.includes('/auth/login')) {
    console.log('Coming from login page, allowing access');
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  try {
    // Check if we have a session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error checking session:', error.message);
    }
    
    const session = data?.session;
    
    // If no session and trying to access protected route
    if (!session) {
      console.log('No session found, redirecting to login page from:', req.nextUrl.pathname);
      
      // Redirect to login page with the return URL
      const redirectUrl = new URL('/auth/login', req.url);
      
      // Include the full URL with query parameters in the redirectTo parameter
      const fullReturnUrl = new URL(req.nextUrl.pathname, req.url);
      
      // Preserve all query parameters from the original request
      req.nextUrl.searchParams.forEach((value, key) => {
        fullReturnUrl.searchParams.set(key, value);
      });
      
      // Set the full URL (with query params) as the redirectTo parameter
      redirectUrl.searchParams.set('redirectTo', fullReturnUrl.toString());
      
      console.log('Redirecting to:', redirectUrl.toString());
      console.log('With return URL:', fullReturnUrl.toString());
      
      return NextResponse.redirect(redirectUrl);
    }
    
    console.log('Session found, allowing access to:', req.nextUrl.pathname);
    return res;
  } catch (err) {
    console.error('Middleware error:', err);
    // In case of error, allow the request to proceed
    // This prevents blocking access due to auth errors
    return res;
  }
}

export const config = {
  // Only apply middleware to dashboard routes
  matcher: ['/dashboard/:path*'],
}; 