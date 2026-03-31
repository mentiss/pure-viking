import { useState, useEffect } from 'react';
import { useSystem } from './useSystem.js';

const useSlugConfig = () => {
    const { slug } = useSystem();
    const [slugConfig, setSlugConfig] = useState(null);

    useEffect(() => {
        import(`../systems/${slug}/config.jsx`)
            .then(mod => setSlugConfig(mod.default))
            .catch(() => setSlugConfig(null));
    }, [slug]);

    return slugConfig;
};

export default useSlugConfig;