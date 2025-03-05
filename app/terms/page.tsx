import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Terms of Service</h1>
          
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <p className="text-gray-600 mb-6 text-sm">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            
            <div className="prose prose-blue max-w-none">
              <p>
                Welcome to TheraScheduler. Please read these Terms of Service carefully before using our platform.
              </p>
              
              <h2>Acceptance of Terms</h2>
              <p>
                By accessing or using TheraScheduler, you agree to be bound by these Terms of Service and all applicable laws and regulations. 
                If you do not agree with any of these terms, you are prohibited from using or accessing this platform.
              </p>
              
              <h2>Use License</h2>
              <p>
                Permission is granted to temporarily use TheraScheduler for personal, non-commercial transitory viewing only. 
                This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul>
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose</li>
                <li>Attempt to decompile or reverse engineer any software contained on TheraScheduler</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              </ul>
              
              <h2>Account Terms</h2>
              <p>
                To access certain features of the platform, you may be required to register for an account. You agree to provide accurate, 
                current, and complete information during the registration process and to update such information to keep it accurate, 
                current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.
              </p>
              
              <h2>User Content</h2>
              <p>
                You retain all rights to any content you submit, post, or display on or through TheraScheduler. By submitting, posting, 
                or displaying content on or through TheraScheduler, you grant us a worldwide, non-exclusive, royalty-free license to use, 
                copy, reproduce, process, adapt, modify, publish, transmit, display, and distribute such content.
              </p>
              
              <h2>Limitation of Liability</h2>
              <p>
                In no event shall TheraScheduler, its officers, directors, employees, or agents, be liable to you for any direct, indirect, 
                incidental, special, punitive, or consequential damages whatsoever resulting from any (i) errors, mistakes, or inaccuracies of content; 
                (ii) personal injury or property damage, of any nature whatsoever, resulting from your access to and use of our platform; 
                (iii) any unauthorized access to or use of our secure servers and/or any and all personal information and/or financial information 
                stored therein; (iv) any interruption or cessation of transmission to or from our platform; (v) any bugs, viruses, trojan horses, 
                or the like, which may be transmitted to or through our platform by any third party; and/or (vi) any errors or omissions in any 
                content or for any loss or damage of any kind incurred as a result of your use of any content posted, emailed, transmitted, 
                or otherwise made available via the platform, whether based on warranty, contract, tort, or any other legal theory, and whether 
                or not the company is advised of the possibility of such damages.
              </p>
              
              <h2>Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
              </p>
              
              <h2>Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will 
                try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
              
              <h2>Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at:
              </p>
              <p>
                Email: legal@therascheduler.com<br />
                Phone: (555) 123-4567
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <Link 
              href="/" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
} 