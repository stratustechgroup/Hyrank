"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SubmitServerModal from "@/components/SubmitServerModal";

/**
 * /submit — dedicated page that opens the submit modal immediately.
 *
 * Middleware gates this route to authenticated users only (redirects to /login
 * with ?next=/submit if unauthenticated).  Once the user lands here they see
 * the form right away; closing the modal returns them to the home page.
 */
export default function SubmitPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    // Give the exit animation time to finish before navigating away
    setTimeout(() => router.push("/"), 350);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <SubmitServerModal isOpen={isOpen} onClose={handleClose} />
    </div>
  );
}
