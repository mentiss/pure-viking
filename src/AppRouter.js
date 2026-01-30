// AppRouter.js - Router principal

const AppRouter = () => {
    const { useState, useEffect } = React;
    const [darkMode, setDarkMode] = useState(false);
    const [currentPath, setCurrentPath] = useState(window.location.pathname);
    
    useEffect(() => {
        // Charger le thème
        const savedTheme = loadTheme();
        setDarkMode(savedTheme);
        if (savedTheme) {
            document.documentElement.classList.add('dark');
        }
        
        // Listener changement URL
        const handlePopState = () => {
            setCurrentPath(window.location.pathname);
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    
    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        saveTheme(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };
    
    // Route /mj → GMView
    if (currentPath === '/mj') {
        return <GMView darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
    }
    
    // Route / → App normal
    return <App darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
};
