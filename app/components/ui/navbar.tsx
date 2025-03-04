import Link from 'next/link'

<div className="flex items-center space-x-4">
  <Link href="/" className="text-lg font-semibold">
    TheraScheduler
  </Link>
  <nav className="hidden md:flex space-x-4">
    <Link href="/" className="hover:text-primary">
      Home
    </Link>
    <Link href="/book" className="hover:text-primary">
      Book Appointment
    </Link>
    <Link href="/about" className="hover:text-primary">
      About
    </Link>
    <Link href="/contact" className="hover:text-primary">
      Contact
    </Link>
  </nav>
</div> 