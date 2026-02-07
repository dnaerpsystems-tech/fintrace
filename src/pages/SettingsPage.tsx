import { motion } from "framer-motion";
import { ChevronRight, Globe, IndianRupee, Palette } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Page } from "@/components/layout/Page";

export function SettingsPage() {
  return (
    <Page>
      <Header title="Settings" showBack />

      <div className="px-4 space-y-6">
        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="ios-caption uppercase tracking-wide px-4 mb-2">General</h3>
          <div className="ios-card divide-y divide-border">
            <div className="ios-list-item">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Currency</p>
                <p className="ios-caption">Indian Rupee (₹)</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="ios-list-item">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Language</p>
                <p className="ios-caption">English</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="ios-list-item">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Theme</p>
                <p className="ios-caption">System Default</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="ios-caption uppercase tracking-wide px-4 mb-2">About</h3>
          <div className="ios-card p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Build</span>
              <span>2024.01.06</span>
            </div>
          </div>
        </motion.div>
      </div>
    </Page>
  );
}

export default SettingsPage;
