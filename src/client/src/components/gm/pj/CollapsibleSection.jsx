import {useState} from "react";

const CollapsibleSection = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-t border-viking-leather/20 dark:border-viking-bronze/20">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center py-2 px-1 text-sm font-semibold text-viking-brown dark:text-viking-parchment hover:text-viking-bronze transition-colors"
            >
                <span>{icon} {title}</span>
                <span className="text-xs text-viking-leather dark:text-viking-bronze">
                    {isOpen ? '▲' : '▼'}
                </span>
            </button>
            {isOpen && (
                <div className="pb-3 px-1">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleSection;