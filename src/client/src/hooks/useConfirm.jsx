// src/client/src/components/modals/useConfirm.js
import React, { useState, useCallback } from 'react';
import ConfirmModal from "../components/modals/ConfirmModal.jsx";

const useConfirm = () => {
    const [opts, setOpts] = useState(null);

    const confirm = useCallback((options) =>
        new Promise((resolve) => {
            setOpts({
                ...options,
                onConfirm: () => { setOpts(null); resolve(true);  },
                onCancel:  () => { setOpts(null); resolve(false); },
            });
        }), []
    );

    const confirmEl = opts ? <ConfirmModal {...opts} /> : null;

    return { confirm, confirmEl };
};

export default useConfirm;