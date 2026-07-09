import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/checkTeeTimeAvailability",
        destination: "/api/tools/checkTeeTimeAvailability"
      },
      {
        source: "/createBookingRequest",
        destination: "/api/tools/createBookingRequest"
      },
      {
        source: "/addToWaitlist",
        destination: "/api/tools/addToWaitlist"
      }
    ];
  }
};

export default nextConfig;
