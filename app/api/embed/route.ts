import { NextResponse } from 'next/server';

/**
 * This API route serves the JavaScript embed code that therapists can add to their websites
 * to display the booking widget directly on their site.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const therapistId = searchParams.get('therapistId');
  
  if (!therapistId) {
    return new NextResponse('Therapist ID is required', { status: 400 });
  }

  // Create the embed script that will be injected into the therapist's website
  const embedScript = `
    (function() {
      // Create modal container
      const modalContainer = document.createElement('div');
      modalContainer.id = 'therascheduler-booking-modal';
      modalContainer.style.display = 'none';
      modalContainer.style.position = 'fixed';
      modalContainer.style.zIndex = '9999';
      modalContainer.style.left = '0';
      modalContainer.style.top = '0';
      modalContainer.style.width = '100%';
      modalContainer.style.height = '100%';
      modalContainer.style.overflow = 'auto';
      modalContainer.style.backgroundColor = 'rgba(0,0,0,0.4)';
      
      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.style.backgroundColor = '#fefefe';
      modalContent.style.margin = '5% auto';
      modalContent.style.padding = '0';
      modalContent.style.border = '1px solid #888';
      modalContent.style.borderRadius = '8px';
      modalContent.style.width = '90%';
      modalContent.style.maxWidth = '900px';
      modalContent.style.maxHeight = '90vh';
      modalContent.style.overflow = 'auto';
      modalContent.style.position = 'relative';
      
      // Create close button
      const closeButton = document.createElement('span');
      closeButton.innerHTML = '&times;';
      closeButton.style.color = '#aaa';
      closeButton.style.position = 'absolute';
      closeButton.style.right = '15px';
      closeButton.style.top = '10px';
      closeButton.style.fontSize = '28px';
      closeButton.style.fontWeight = 'bold';
      closeButton.style.cursor = 'pointer';
      closeButton.onclick = function() {
        modalContainer.style.display = 'none';
        document.body.style.overflow = 'auto';
      };
      
      // Create iframe for booking widget
      const iframe = document.createElement('iframe');
      iframe.src = '${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/embed?therapist=${therapistId}';
      iframe.style.width = '100%';
      iframe.style.height = '80vh';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      
      // Assemble modal
      modalContent.appendChild(closeButton);
      modalContent.appendChild(iframe);
      modalContainer.appendChild(modalContent);
      document.body.appendChild(modalContainer);
      
      // Add click event to all booking buttons
      function setupBookingButtons() {
        const bookingButtons = document.querySelectorAll('[data-therascheduler-booking]');
        bookingButtons.forEach(button => {
          button.addEventListener('click', function(e) {
            e.preventDefault();
            modalContainer.style.display = 'block';
            document.body.style.overflow = 'hidden';
          });
        });
      }
      
      // Setup buttons when DOM is loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupBookingButtons);
      } else {
        setupBookingButtons();
      }
      
      // Expose global function to open booking modal programmatically
      window.openTheraScheduler = function() {
        modalContainer.style.display = 'block';
        document.body.style.overflow = 'hidden';
      };
    })();
  `;

  return new NextResponse(embedScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'max-age=3600'
    }
  });
} 