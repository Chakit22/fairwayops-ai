import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
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
      },
      {
        source: "/createStaffTask",
        destination: "/api/tools/createStaffTask"
      }
    ];
  }
};

export default nextConfig;
