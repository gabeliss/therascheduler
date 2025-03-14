import { NextResponse } from 'next/server';

// For MVP, we'll use a simple console log for emails
// In production, you would integrate with a service like SendGrid, Mailgun, etc.
export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // In a real implementation, you would send the email here
    // For MVP, we'll just log it to the console
    console.log('SENDING EMAIL:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML:', html);

    // For development/testing, always return success
    // In production, you would check the response from your email service
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
} 