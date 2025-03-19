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

  // Create the embed script that references our secure widget-preview endpoint
  const js = `
  (function() {
    // Therascheduler widget initialization
    var therapistId = "${therapistId}";
    var primaryColor = "${primaryColor}";
    var buttonText = "${buttonText}";
    var modalTitle = "${modalTitle}";
    
    // Create button element
    var button = document.createElement("button");
    button.innerHTML = buttonText;
    button.style.backgroundColor = primaryColor;
    button.style.color = "white";
    button.style.border = "none";
    button.style.padding = "10px 20px";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.fontFamily = "system-ui, sans-serif";
    button.style.fontWeight = "500";
    
    // Create modal elements
    var modal = document.createElement("div");
    var modalOverlay = document.createElement("div");
    var modalContent = document.createElement("div");
    var closeButton = document.createElement("button");
    var iframe = document.createElement("iframe");
    
    // Set up modal
    modal.style.display = "none";
    modal.style.position = "fixed";
    modal.style.zIndex = "9999";
    modal.style.left = "0";
    modal.style.top = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.overflow = "auto";
    modal.style.fontFamily = "system-ui, sans-serif";
    
    // Set up overlay
    modalOverlay.style.position = "fixed";
    modalOverlay.style.width = "100%";
    modalOverlay.style.height = "100%";
    modalOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    
    // Set up modal content
    modalContent.style.backgroundColor = "#fefefe";
    modalContent.style.margin = "10% auto";
    modalContent.style.padding = "20px";
    modalContent.style.border = "1px solid #888";
    modalContent.style.width = "${widgetWidth}";
    modalContent.style.maxWidth = "95%";
    modalContent.style.borderRadius = "8px";
    modalContent.style.position = "relative";
    
    // Set up close button
    closeButton.innerHTML = "×";
    closeButton.style.color = "#aaa";
    closeButton.style.float = "right";
    closeButton.style.fontSize = "28px";
    closeButton.style.fontWeight = "bold";
    closeButton.style.border = "none";
    closeButton.style.background = "none";
    closeButton.style.cursor = "pointer";
    closeButton.style.position = "absolute";
    closeButton.style.right = "10px";
    closeButton.style.top = "5px";
    
    // Set up iframe
    iframe.style.width = "100%";
    iframe.style.height = "${widgetHeight}";
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    
    // Set iframe source to our secure API endpoint
    var baseUrl = "${process.env.NEXT_PUBLIC_APP_URL || "https://therascheduler.vercel.app"}";
    iframe.src = baseUrl + "/api/widget-preview?" + new URLSearchParams({
      therapistId: therapistId,
      primaryColor: primaryColor,
      buttonText: buttonText,
      modalTitle: modalTitle,
      embedded: 'true'
    }).toString();
    
    // Add global functions to control the widget
    window.openTheraScheduler = function() {
      modal.style.display = "block";
      document.body.style.overflow = "hidden";
    };
    
    window.closeTheraScheduler = function() {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    };
    
    // Function to update iframe when a date is selected
    window.updateTheraSchedulerDate = function(date) {
      if (!date) return;
      
      try {
        // Format date to YYYY-MM-DD
        const formattedDate = date instanceof Date 
          ? date.toISOString().split('T')[0]
          : new Date(date).toISOString().split('T')[0];
        
        // Update iframe URL with the new date
        const currentUrl = new URL(iframe.src);
        currentUrl.searchParams.set('date', formattedDate);
        iframe.src = currentUrl.toString();
      } catch (err) {
        console.error('Error updating TheraScheduler date:', err);
      }
    };
    
    // Assemble modal
    modalContent.appendChild(closeButton);
    modalContent.appendChild(document.createElement("h2")).textContent = modalTitle;
    modalContent.appendChild(iframe);
    modal.appendChild(modalOverlay);
    modal.appendChild(modalContent);
    
    // Add event listeners
    button.addEventListener("click", function() {
      modal.style.display = "block";
      document.body.style.overflow = "hidden";
    });
    
    closeButton.addEventListener("click", function() {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    });
    
    modalOverlay.addEventListener("click", function() {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    });
    
    // Add elements to document
    var container = document.querySelector("[data-therascheduler-booking='true']");
    if (container) {
      container.appendChild(button);
    } else {
      document.currentScript.parentNode.appendChild(button);
    }
    document.body.appendChild(modal);
  })();
  `;

  return new NextResponse(js, {
    headers: {
      'Content-Type': 'application/javascript',
    },
  });
} 