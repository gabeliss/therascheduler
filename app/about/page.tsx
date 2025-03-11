import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">About TheraScheduler</h1>
          
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-700 mb-6">
              TheraScheduler is dedicated to empowering therapists with intuitive scheduling tools that simplify practice management. 
              Our platform is designed to help therapists focus on what matters most—providing quality care to their clients.
            </p>
            
            <h2 className="text-2xl font-semibold mb-4">Who We Are</h2>
            <p className="text-gray-700 mb-6">
              Founded by a team passionate about mental health and technology, TheraScheduler combines clinical expertise with 
              cutting-edge software development. Our team understands the unique challenges therapists face in managing their practices 
              and has built a solution specifically tailored to address these needs.
            </p>
            
            <h2 className="text-2xl font-semibold mb-4">Our Values</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
              <li><span className="font-medium">Simplicity</span> - We believe in creating intuitive tools that require minimal training.</li>
              <li><span className="font-medium">Security</span> - We prioritize the protection of sensitive client information.</li>
              <li><span className="font-medium">Support</span> - We&apos;re committed to providing exceptional customer service.</li>
              <li><span className="font-medium">Innovation</span> - We continuously improve our platform based on user feedback.</li>
            </ul>
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