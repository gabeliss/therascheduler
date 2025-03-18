
  (function() {
    // Therascheduler widget initialization
    var therapistId = "testid";
    var primaryColor = "#0f766e";
    var buttonText = "Book Appointment";
    var modalTitle = "Book Your Appointment";
    
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
    modalContent.style.width = "900px";
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
    iframe.style.height = "80vh";
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    
    // Set iframe source to our secure API endpoint
    var baseUrl = "https://therascheduler.vercel.app";
    iframe.src = baseUrl + "/api/widget-preview?" + new URLSearchParams({
      therapistId: therapistId,
      primaryColor: primaryColor,
      buttonText: buttonText,
      modalTitle: modalTitle
    }).toString();
    
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
  