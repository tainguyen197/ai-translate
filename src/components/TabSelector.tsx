import React from "react";

type Tab = {
  id: string;
  name: string;
  icon: React.ReactNode;
};

type TabSelectorProps = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
};

const TabSelector: React.FC<TabSelectorProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-1 flex mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md font-medium text-sm transition ${
            activeTab === tab.id
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <div className="mr-2">{tab.icon}</div>
          {tab.name}
        </button>
      ))}
    </div>
  );
};

export default TabSelector;
