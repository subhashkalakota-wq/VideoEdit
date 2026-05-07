import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import SupportedActions from "@/components/SupportedActions";
import VideoWorkspace from "@/components/VideoWorkspace";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        {/* Landing */}
        <Hero />
        <HowItWorks />
        <SupportedActions />

        {/* Upload → Command → Output Video */}
        <VideoWorkspace />
      </main>
      <Footer />
    </>
  );
}
