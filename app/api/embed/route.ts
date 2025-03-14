import { NextResponse } from 'next/server';

/**
 * This API route serves the JavaScript embed code that therapists can add to their websites
 * to display the booking widget directly on their site.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const therapistId = searchParams.get('therapistId');
  
  // Get customization options from query params
  const primaryColor = searchParams.get('primaryColor') || '#0f766e'; // Default teal color
  const buttonText = searchParams.get('buttonText') || 'Book Appointment';
  const modalTitle = searchParams.get('modalTitle') || 'Book Your Appointment';
  const widgetWidth = searchParams.get('width') || '900px';
  const widgetHeight = searchParams.get('height') || '80vh';
  
  if (!therapistId) {
    return new NextResponse('Therapist ID is required', { status: 400 });
  }

  // Create the embed script that will be injected into the therapist's website
  const embedScript = `
    (function() {
      // Create stylesheet for the widget
      const style = document.createElement('style');
      style.textContent = \`
        .therascheduler-button {
          background-color: ${primaryColor};
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 16px;
          transition: opacity 0.2s ease;
        }
        .therascheduler-button:hover {
          opacity: 0.9;
        }
        #therascheduler-booking-modal {
          display: none;
          position: fixed;
          z-index: 9999;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          overflow: auto;
          background-color: rgba(0,0,0,0.5);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          animation: theraschedulerFadeIn 0.3s ease;
        }
        @keyframes theraschedulerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .therascheduler-modal-content {
          background-color: #fefefe;
          margin: 5% auto;
          padding: 0;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          width: 90%;
          max-width: ${widgetWidth};
          max-height: 90vh;
          overflow: auto;
          position: relative;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          animation: theraschedulerSlideIn 0.3s ease;
        }
        @keyframes theraschedulerSlideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .therascheduler-modal-header {
          padding: 15px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .therascheduler-modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }
        .therascheduler-close {
          color: #6b7280;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
          line-height: 1;
        }
        .therascheduler-close:hover {
          color: #111827;
        }
        .therascheduler-iframe-container {
          width: 100%;
          height: ${widgetHeight};
          overflow: hidden;
        }
        .therascheduler-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
        .therascheduler-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          width: 100%;
          position: absolute;
          top: 0;
          left: 0;
          background-color: #fff;
        }
        .therascheduler-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid ${primaryColor};
          border-radius: 50%;
          animation: theraschedulerSpin 1s linear infinite;
        }
        @keyframes theraschedulerSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      \`;
      document.head.appendChild(style);
      
      // Create modal container
      const modalContainer = document.createElement('div');
      modalContainer.id = 'therascheduler-booking-modal';
      
      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.className = 'therascheduler-modal-content';
      
      // Create modal header
      const modalHeader = document.createElement('div');
      modalHeader.className = 'therascheduler-modal-header';
      
      // Create modal title
      const modalTitle = document.createElement('h2');
      modalTitle.className = 'therascheduler-modal-title';
      modalTitle.textContent = '${modalTitle}';
      
      // Create close button
      const closeButton = document.createElement('span');
      closeButton.className = 'therascheduler-close';
      closeButton.innerHTML = '&times;';
      closeButton.onclick = function() {
        modalContainer.style.display = 'none';
        document.body.style.overflow = 'auto';
      };
      
      // Create iframe container
      const iframeContainer = document.createElement('div');
      iframeContainer.className = 'therascheduler-iframe-container';
      
      // Create loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'therascheduler-loading';
      const spinner = document.createElement('div');
      spinner.className = 'therascheduler-spinner';
      loadingDiv.appendChild(spinner);
      
      // Create iframe for booking widget
      const iframe = document.createElement('iframe');
      iframe.className = 'therascheduler-iframe';
      iframe.src = '${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/embed?therapist=${therapistId}';
      iframe.onload = function() {
        loadingDiv.style.display = 'none';
      };
      
      // Handle communication with the iframe
      window.addEventListener('message', function(event) {
        // Verify the origin of the message
        if (event.origin !== '${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}') return;
        
        // Handle different message types
        if (event.data.type === 'booking-success') {
          // You can add custom behavior here when booking is successful
          console.log('Booking successful!');
        } else if (event.data.type === 'booking-error') {
          console.error('Booking error:', event.data.message);
        } else if (event.data.type === 'resize-iframe') {
          // Adjust iframe height if needed
          iframe.style.height = event.data.height + 'px';
        }
      });
      
      // Assemble modal
      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);
      iframeContainer.appendChild(loadingDiv);
      iframeContainer.appendChild(iframe);
      modalContent.appendChild(modalHeader);
      modalContent.appendChild(iframeContainer);
      modalContainer.appendChild(modalContent);
      document.body.appendChild(modalContainer);
      
      // Create default booking button if none exists
      if (document.querySelectorAll('[data-therascheduler-booking]').length === 0) {
        const defaultButton = document.createElement('button');
        defaultButton.className = 'therascheduler-button';
        defaultButton.setAttribute('data-therascheduler-booking', 'true');
        defaultButton.textContent = '${buttonText}';
        
        // Find the script tag that loaded this widget
        const scripts = document.getElementsByTagName('script');
        const currentScript = scripts[scripts.length - 1];
        currentScript.parentNode.insertBefore(defaultButton, currentScript.nextSibling);
      }
      
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
      
      // Handle ESC key to close modal
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalContainer.style.display === 'block') {
          modalContainer.style.display = 'none';
          document.body.style.overflow = 'auto';
        }
      });
      
      // Close modal when clicking outside content
      modalContainer.addEventListener('click', function(e) {
        if (e.target === modalContainer) {
          modalContainer.style.display = 'none';
          document.body.style.overflow = 'auto';
        }
      });
      
      // Expose global function to open booking modal programmatically
      window.openTheraScheduler = function() {
        modalContainer.style.display = 'block';
        document.body.style.overflow = 'hidden';
      };
      
      // Expose global function to close booking modal programmatically
      window.closeTheraScheduler = function() {
        modalContainer.style.display = 'none';
        document.body.style.overflow = 'auto';
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