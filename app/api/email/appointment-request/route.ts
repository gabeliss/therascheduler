import { NextResponse } from 'next/server';
import { supabase } from '@/app/utils/supabase';

export async function POST(request: Request) {
  try {
    const {
      therapistId,
      clientName,
      clientEmail,
      appointmentDate,
      appointmentTime,
      notes
    } = await request.json();

    // Validate required fields
    if (!therapistId || !clientName || !clientEmail || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { error: 'Missing required fields for appointment request notification' },
        { status: 400 }
      );
    }

    // Get therapist details
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('name, email')
      .eq('id', therapistId)
      .single();

    if (therapistError || !therapist) {
      console.error('Error fetching therapist:', therapistError);
      return NextResponse.json(
        { error: 'Therapist not found' },
        { status: 404 }
      );
    }

    // Create email content for therapist
    const therapistEmailHtml = `
      <h2>New Appointment Request</h2>
      <p>Hello ${therapist.name},</p>
      <p>You have received a new appointment request:</p>
      <ul>
        <li><strong>Client:</strong> ${clientName}</li>
        <li><strong>Email:</strong> ${clientEmail}</li>
        <li><strong>Date:</strong> ${appointmentDate}</li>
        <li><strong>Time:</strong> ${appointmentTime}</li>
        ${notes ? `<li><strong>Notes:</strong> ${notes}</li>` : ''}
      </ul>
      <p>Please log in to your dashboard to approve or deny this request.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/appointments">Go to Dashboard</a></p>
    `;

    // Create email content for client
    const clientEmailHtml = `
      <h2>Appointment Request Confirmation</h2>
      <p>Hello ${clientName},</p>
      <p>Your appointment request with ${therapist.name} has been submitted:</p>
      <ul>
        <li><strong>Date:</strong> ${appointmentDate}</li>
        <li><strong>Time:</strong> ${appointmentTime}</li>
        ${notes ? `<li><strong>Your Notes:</strong> ${notes}</li>` : ''}
      </ul>
      <p>This appointment is currently <strong>pending approval</strong> from ${therapist.name}.</p>
      <p>You will receive another email once your appointment is confirmed or if any changes are needed.</p>
    `;

    // Send email to therapist
    const therapistEmailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: therapist.email,
        subject: `New Appointment Request from ${clientName}`,
        html: therapistEmailHtml,
      }),
    });

    if (!therapistEmailResponse.ok) {
      console.error('Error sending email to therapist');
    }

    // Send email to client
    const clientEmailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: clientEmail,
        subject: `Appointment Request Confirmation - ${therapist.name}`,
        html: clientEmailHtml,
      }),
    });

    if (!clientEmailResponse.ok) {
      console.error('Error sending email to client');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending appointment request notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send appointment request notifications' },
      { status: 500 }
    );
  }
} 