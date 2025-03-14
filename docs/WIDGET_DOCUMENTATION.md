# TheraScheduler Embeddable Booking Widget

This document provides detailed information about the embeddable booking widget for TheraScheduler, including how to implement it, customize it, and test it.

## Overview

The embeddable booking widget allows therapists to add a booking system directly to their own websites. Clients can book appointments without leaving the therapist's website, creating a seamless experience.

## Implementation

### Basic Implementation

To add the booking widget to your website, add the following code to your HTML where you want the booking button to appear:

```html
<script src="https://yourapp.com/api/embed?therapistId=YOUR_THERAPIST_ID"></script>
<div data-therascheduler-booking="true"></div>
```

Replace `YOUR_THERAPIST_ID` with your actual therapist ID from TheraScheduler. You can find this ID in your dashboard under the Widget section.

### Customization Options

You can customize the appearance of the widget by adding parameters to the script URL:

```html
<script src="https://yourapp.com/api/embed?therapistId=YOUR_THERAPIST_ID&primaryColor=%230f766e&buttonText=Book%20Now&modalTitle=Schedule%20Your%20Session"></script>
<div data-therascheduler-booking="true"></div>
```

Available customization options:

| Parameter      | Description                                       | Default Value           | Example                             |
| -------------- | ------------------------------------------------- | ----------------------- | ----------------------------------- |
| `primaryColor` | The main color for buttons and accents (hex code) | `#0f766e`               | `primaryColor=%23ff5500`            |
| `buttonText`   | Text displayed on the booking button              | `Book Appointment`      | `buttonText=Schedule%20Now`         |
| `modalTitle`   | Title displayed at the top of the booking modal   | `Book Your Appointment` | `modalTitle=Schedule%20a%20Session` |
| `width`        | Width of the booking modal                        | `900px`                 | `width=800px`                       |
| `height`       | Height of the booking modal                       | `80vh`                  | `height=600px`                      |

Note: URL parameters need to be properly encoded. For example, use `%23` instead of `#` for hex color codes.

### Custom Buttons

If you prefer to use your own button design, you can add the `data-therascheduler-booking="true"` attribute to any HTML element:

```html
<script src="https://yourapp.com/api/embed?therapistId=YOUR_THERAPIST_ID"></script>
<button
	data-therascheduler-booking="true"
	class="your-custom-button-class"
>
	Schedule a Session
</button>
```

### Programmatic Control

You can also open and close the booking widget programmatically:

```javascript
// Open the booking widget
window.openTheraScheduler();

// Close the booking widget
window.closeTheraScheduler();
```

## Client Booking Flow

1. Client clicks the booking button on your website
2. A modal opens with the booking widget
3. Client selects a date and available time slot
4. Client enters their information (name, email, etc.)
5. Client submits the booking request
6. You receive a notification and can approve or deny the request
7. Client receives a confirmation email once approved

## Testing

Before adding the widget to your live website, you can test it in the TheraScheduler dashboard:

1. Log in to your TheraScheduler account
2. Go to Dashboard > Widget
3. Use the preview feature to test the full booking flow
4. Make any necessary customizations
5. Copy the embed code and add it to your website

## Troubleshooting

### Widget Not Appearing

- Make sure you've included both the script tag and a button element with the `data-therascheduler-booking` attribute
- Check that your therapist ID is correct
- Verify that there are no JavaScript errors in your browser console

### No Available Time Slots

- Check your availability settings in the TheraScheduler dashboard
- Make sure you've set up recurring availability or specific dates

### Styling Conflicts

- If the widget styling conflicts with your website, you may need to adjust your website's CSS
- The widget is designed to work with most modern websites without conflicts

## Support

If you encounter any issues with the booking widget, please contact support at support@therascheduler.com or visit the help center at https://therascheduler.com/help.
