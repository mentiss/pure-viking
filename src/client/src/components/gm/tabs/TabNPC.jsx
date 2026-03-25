// src/client/src/components/gm/tabs/TabNPC.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Onglet générique de gestion des PNJ — utilisable par tous les slugs.
//
// Props :
//   npc         {object}          — config slug (bloc `npc` de config.jsx)
//   sessionId   {number|null}     — session active (pour les sets liés)
//   GMDiceModal {Component|null}  — modale de jet GM, retransmise aux callbacks slug
//
// Contrat `npc` (tous optionnels — dégradation gracieuse) :
//   renderNPCForm    (slugForm, onChange)  => ReactNode
//   buildNPCData     (slugForm)            => { combat_stats, system_data }
//   parseNPCData     (npc)                => slugForm
//   renderNPCSummary (npc)                => ReactNode
//   renderNPCDetail  (npc, GMDiceModal)   => ReactNode
//   getQuickRolls    (npc)                => [{ label, buildNotation, buildCtx? }]
//     buildNotation (npc)                 => string | string[]
//     buildCtx?     (npc, sessionId)      => RollContext complet (optionnel)
//
// ⚠️  Classes CSS uniquement depuis index.css. Aucun style inline.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFetch }  from '../../../hooks/useFetch.js';
import { useSystem } from '../../../hooks/useSystem.js';
import { roll }      from '../../../tools/diceEngine.js';
import NPCCard       from '../npc/NPCCard.jsx';
import NPCSetCard    from '../npc/NPCSetCard.jsx';
import ConfirmModal  from '../../modals/ConfirmModal.jsx';

// ─── Constantes ──────────────────────────────────────────────────────────────

const SUB_TABS = [
    { id: 'library', label: '📚 Bibliothèque' },
    { id: 'sets',    label: '🗂 Sets'          },
];

const DEFAULT_TPL_FORM = { name: '', description: '' };
const DEFAULT_SET_FORM = { name: '', description: '', session_id: null };

// ─── TextField — défini HORS composant pour éviter la recréation à chaque render

const TextField = ({ label, value, onChange, placeholder, multiline = false, required = false }) => (
    <div>
        <label className="block text-xs font-semibold mb-1 text-muted">
            {label}{required && ' *'}
        </label>
        {multiline ? (
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                rows={3}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg border border-base bg-surface text-base text-sm resize-none"
            />
        ) : (
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg border border-base bg-surface text-base text-sm"
            />
        )}
    </div>
);

const parseCurrentData = (data) => {
    console.log('parseCurrentData', data);
    const [subTab = 'library', view = 'list', id = null] = (data ?? '').split('-');
    return { subTab, view, id };
};

// ─── Composant principal ──────────────────────────────────────────────────────

const TabNPC = ({ npc: npcConfig = {}, sessionId = null, GMDiceModal = null, currentData = null, onChangeCurrentData = null }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();

    // Refs stables pour les callbacks (évite les dépendances instables)
    const fetchRef = useRef(fetchWithAuth);
    const apiRef   = useRef(apiBase);
    useEffect(() => { fetchRef.current = fetchWithAuth; }, [fetchWithAuth]);
    useEffect(() => { apiRef.current   = apiBase;       }, [apiBase]);

    // ── Navigation ────────────────────────────────────────────────────────────
    const { subTab: initSubTab, view: initView } = parseCurrentData(currentData);

    const [subTab, setSubTab] = useState(initSubTab);
    const [view,   setView]   = useState(initView);

    // ── État bibliothèque ─────────────────────────────────────────────────────
    const [templates,  setTemplates]  = useState([]);
    const [tplLoading, setTplLoading] = useState(false);
    const [tplError,   setTplError]   = useState(null);
    const [search,     setSearch]     = useState('');

    // ── État formulaire template ──────────────────────────────────────────────
    const [tplForm,    setTplForm]    = useState(DEFAULT_TPL_FORM);
    const [slugForm,   setSlugForm]   = useState({});
    const [tplEditing, setTplEditing] = useState(null); // id en édition, null = création
    const [tplSaving,  setTplSaving]  = useState(false);
    const [tplError2,  setTplError2]  = useState(null); // erreur formulaire (distinct de tplError chargement)

    // ── État détail template ──────────────────────────────────────────────────
    const [detailNpc,  setDetailNpc]  = useState(null);
    const [rollingIdx, setRollingIdx] = useState(null);
    const [rollResult, setRollResult] = useState(null);

    // ── État sets ─────────────────────────────────────────────────────────────
    const [sets,        setSets]        = useState([]);
    const [setsLoading, setSetsLoading] = useState(false);
    const [setsError,   setSetsError]   = useState(null);
    const [setsFilter,  setSetsFilter]  = useState('all');

    // ── État formulaire set ───────────────────────────────────────────────────
    const [setFormData,   setSetFormData]   = useState(DEFAULT_SET_FORM);
    const [setEditing,    setSetEditing]    = useState(null); // id du set en édition/copie source
    const [setSavingFlag, setSetSavingFlag] = useState(false);
    const [setFormError,  setSetFormError]  = useState(null);

    // ── État détail set ───────────────────────────────────────────────────────
    const [detailSet, setDetailSet] = useState(null);

    // ── Confirmations ─────────────────────────────────────────────────────────
    const [confirmDeleteTpl, setConfirmDeleteTpl] = useState(null); // { id, name }
    const [confirmDeleteSet, setConfirmDeleteSet] = useState(null); // { id, name }

    // ─── Chargement ───────────────────────────────────────────────────────────

    const loadTemplates = useCallback(async () => {
        setTplLoading(true);
        setTplError(null);
        try {
            const res  = await fetchRef.current(`${apiRef.current}/npc`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Erreur chargement');
            setTemplates(data);
        } catch (err) {
            setTplError(err.message);
        } finally {
            setTplLoading(false);
        }
    }, []);

    const loadSets = useCallback(async (filter = 'all') => {
        setSetsLoading(true);
        setSetsError(null);
        try {
            let url = `${apiRef.current}/npc-sets`;
            if (filter === 'session' && sessionId) url += `?session_id=${sessionId}`;
            if (filter === 'free')                 url += `?free=1`;
            const res  = await fetchRef.current(url);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Erreur chargement');
            setSets(data);
        } catch (err) {
            setSetsError(err.message);
        } finally {
            setSetsLoading(false);
        }
    }, [sessionId]);

    // ─── Navigation ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!onChangeCurrentData) return;
        const id = detailNpc?.id ?? detailSet?.id ?? tplEditing ?? setEditing ?? null;
        const ref = id ? `${subTab}-${view}-${id}` : `${subTab}-${view}`;
        onChangeCurrentData(ref);
    }, [subTab, view, detailNpc, detailSet, tplEditing, setEditing]);

    useEffect(() => {
        console.log('[EFFECT] subTab = ', subTab, 'view = ', view, 'currentData = ', currentData);
        const { id } = parseCurrentData(currentData);

        if (subTab === 'library') {
            if      (view === 'detail' && !detailNpc)  id ? loadAndOpenDetail(id)  : goToLibrary();
            else if (view === 'form'   && !tplEditing)  id ? loadAndOpenEdit(id)    : openCreate();
            else if (view === 'list') loadTemplates();
        }

        if (subTab === 'sets') {
            console.log('found sets !');
            if      (view === 'setdetail' && !detailSet) id ? openSet({id: id}, view) : goToSets();
            else if (view === 'setform'   && !setEditing) id ? openSet({id: id}, view)   : openCreateSet();
            else if (view === 'setcopy') openSet(detailSet, view);
            else if (view === 'setlist') loadSets(setsFilter);
        }
    }, [subTab, view]);

    const loadAndOpenDetail = async (id) => {
        setTplLoading(true);
        setTplError(null);
        try {
            const res  = await fetchRef.current(`${apiRef.current}/npc/${id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Erreur chargement');
            openDetail(data);
        } catch (err) {
            setTplError(err.message);
            goToLibrary();
        } finally {
            setTplLoading(false);
        }
    };

    const loadAndOpenEdit = async (id) => {
        setTplLoading(true);
        setTplError(null);
        try {
            const res  = await fetchRef.current(`${apiRef.current}/npc/${id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Erreur chargement');
            openEdit(data);
        } catch (err) {
            setTplError(err.message);
            goToLibrary();
        } finally {
            setTplLoading(false);
        }
    };

    const goToLibrary = () => {
        setSubTab('library');
        setView('list');
        resetAll();
    };

    const goToSets = () => {
        setSubTab('sets');
        setView('setlist');
        resetAll();
    };

    const changeSubTab = (id) => {
        setSubTab(id);
        setView(id === 'sets' ? 'setlist' : 'list');
        resetAll();
    };

    const resetAll = () => {
        setDetailNpc(null);
        setDetailSet(null);
        setTplEditing(null);
        setSetEditing(null);
        setTplError2(null);
        setSetFormError(null);
        setTplError(null);
        setSetsError(null);
    };

    // ─── Handlers templates ───────────────────────────────────────────────────

    const openCreate = () => {
        const defaultSlug = npcConfig.parseNPCData ? npcConfig.parseNPCData({}) : {};
        setTplForm(DEFAULT_TPL_FORM);
        setSlugForm(defaultSlug);
        setTplEditing(null);
        setTplError2(null);
        setView('form');
    };

    const openEdit = (npc) => {
        const parsed = npcConfig.parseNPCData ? npcConfig.parseNPCData(npc) : {};
        setTplForm({ name: npc.name ?? '', description: npc.description ?? '' });
        setSlugForm(parsed);
        setTplEditing(npc.id);
        setTplError2(null);
        setView('form');
    };

    const openDetail = (npc) => {
        setDetailNpc(npc);
        setRollResult(null);
        setView('detail');
    };

    const handleSlugChange = (field, value) =>
        setSlugForm(prev => ({ ...prev, [field]: value }));

    const handleSaveTemplate = async () => {
        if (!tplForm.name?.trim()) { setTplError2('Le nom est obligatoire.'); return; }
        setTplSaving(true);
        setTplError2(null);
        try {
            const { combat_stats = {}, system_data = {} } = npcConfig.buildNPCData
                ? npcConfig.buildNPCData(slugForm)
                : {};
            const payload = {
                name:        tplForm.name.trim(),
                description: tplForm.description || null,
                combat_stats,
                system_data,
            };
            const url    = tplEditing ? `${apiBase}/npc/${tplEditing}` : `${apiBase}/npc`;
            const method = tplEditing ? 'PUT' : 'POST';
            const res    = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Erreur sauvegarde');
            await loadTemplates();
            goToLibrary();
        } catch (err) {
            setTplError2(err.message);
        } finally {
            setTplSaving(false);
        }
    };

    const handleDeleteTemplate = async (id) => {
        try {
            const res = await fetchWithAuth(`${apiBase}/npc/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erreur suppression');
            setTemplates(prev => prev.filter(t => t.id !== id));
            if (detailNpc?.id === id) goToLibrary();
        } catch (err) {
            console.error('[TabNPC] Delete template error:', err);
        } finally {
            setConfirmDeleteTpl(null);
        }
    };

    // ─── Jets rapides ─────────────────────────────────────────────────────────

    const handleQuickRoll = async (npc, rollDef, idx) => {
        if (rollingIdx !== null) return;
        setRollingIdx(idx);
        setRollResult(null);
        try {
            const notation = rollDef.buildNotation(npc);
            // buildCtx optionnel — si fourni, le slug construit le ctx complet
            // (systemData, hooks, etc.). Sinon ctx minimal générique.
            const ctx = rollDef.buildCtx
                ? rollDef.buildCtx(npc, sessionId)
                : { label: rollDef.label, sessionId: sessionId ?? undefined };
            const result = await roll(notation, ctx);
            setRollResult({ label: rollDef.label, result });
        } catch (err) {
            console.error('[TabNPC] Quick roll error:', err);
        } finally {
            setRollingIdx(null);
        }
    };

    // ─── Handlers sets ────────────────────────────────────────────────────────

    const openCreateSet = () => {
        setSetFormData({ ...DEFAULT_SET_FORM, session_id: sessionId ?? null });
        setSetEditing(null);
        setSetFormError(null);
        setView('setform');
    };

    const openSet = async (set, view = 'setdetail') => {
        setSetsError(null);
        console.log('[TabNPC] openSet : ', set, view);
        try {
            const [resSet, resTemplates] = await Promise.all([
                fetchRef.current(`${apiBase}/npc-sets/${set.id}`),
                fetchRef.current(`${apiBase}/npc`),
            ]);
            const [dataSet, dataTemplates] = await Promise.all([resSet.json(), resTemplates.json()]);
            if (!resSet.ok)       throw new Error(dataSet.error       ?? 'Erreur chargement set');
            if (!resTemplates.ok) throw new Error(dataTemplates.error ?? 'Erreur chargement templates');
            setDetailSet(dataSet);
            setTemplates(dataTemplates);
            setSetFormData({
                name:        (view === 'setcopy') ? `Copie de ${dataSet.name}` : dataSet.name ?? '',
                description: dataSet.description ?? '',
                session_id:  sessionId ?? null,
            });
            setSetEditing(dataSet.id); // id du set source pour la copie
            setSetFormError(null);
            setView(view);
        } catch (err) {
            setSetsError(err.message);
        }
    };

    const handleSaveSet = async () => {
        if (!setFormData.name?.trim()) { setSetFormError('Le nom est obligatoire.'); return; }
        setSetSavingFlag(true);
        setSetFormError(null);
        try {
            const payload = {
                name:        setFormData.name.trim(),
                description: setFormData.description || null,
                session_id:  setFormData.session_id  ?? null,
            };
            const isEdit = setEditing != null && view === 'setform';
            const url    = isEdit ? `${apiBase}/npc-sets/${setEditing}` : `${apiBase}/npc-sets`;
            const method = isEdit ? 'PUT' : 'POST';
            const res    = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Erreur sauvegarde');
            await loadSets(setsFilter);
            goToSets();
        } catch (err) {
            setSetFormError(err.message);
        } finally {
            setSetSavingFlag(false);
        }
    };

    const handleCopySet = async () => {
        if (!setFormData.name?.trim()) { setSetFormError('Le nom est obligatoire.'); return; }
        setSetSavingFlag(true);
        setSetFormError(null);
        try {
            const res  = await fetchWithAuth(`${apiBase}/npc-sets/${setEditing}/copy`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    name:       setFormData.name.trim(),
                    session_id: setFormData.session_id ?? null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Erreur copie');
            await loadSets(setsFilter);
            goToSets();
        } catch (err) {
            setSetFormError(err.message);
        } finally {
            setSetSavingFlag(false);
        }
    };

    const handleDeleteSet = async (id) => {
        try {
            const res = await fetchWithAuth(`${apiBase}/npc-sets/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erreur suppression');
            setSets(prev => prev.filter(s => s.id !== id));
            if (detailSet?.id === id) goToSets();
        } catch (err) {
            console.error('[TabNPC] Delete set error:', err);
        } finally {
            setConfirmDeleteSet(null);
        }
    };

    const handleAddTemplateToSet = async (setId, templateId) => {
        try {
            const res  = await fetchWithAuth(`${apiBase}/npc-sets/${setId}/entries`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ template_id: templateId, quantity: 1 }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Erreur ajout');
            setDetailSet(data);
            setSets(prev => prev.map(s =>
                s.id === setId ? { ...s, entry_count: data.entries.length } : s
            ));
        } catch (err) {
            console.error('[TabNPC] Add entry error:', err);
        }
    };

    const handleUpdateEntryQty = async (setId, entryId, quantity) => {
        if (quantity < 1) return;
        try {
            const res  = await fetchWithAuth(`${apiBase}/npc-sets/${setId}/entries/${entryId}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ quantity }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Erreur mise à jour');
            setDetailSet(data);
        } catch (err) {
            console.error('[TabNPC] Update entry qty error:', err);
        }
    };

    const handleRemoveEntry = async (setId, entryId) => {
        try {
            const res  = await fetchWithAuth(`${apiBase}/npc-sets/${setId}/entries/${entryId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Erreur suppression');
            setDetailSet(data);
            setSets(prev => prev.map(s =>
                s.id === setId ? { ...s, entry_count: data.entries.length } : s
            ));
        } catch (err) {
            console.error('[TabNPC] Remove entry error:', err);
        }
    };

    // ─── Filtrage local ───────────────────────────────────────────────────────

    const filteredTemplates = templates.filter(npc => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return npc.name?.toLowerCase().includes(q) || npc.description?.toLowerCase().includes(q);
    });

    // ─── Rendu : sous-onglets ─────────────────────────────────────────────────

    const renderSubTabs = () => (
        <div className="flex gap-1 mb-4 p-1 rounded-lg bg-surface-alt">
            {SUB_TABS.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => changeSubTab(tab.id)}
                    className={`flex-1 px-3 py-1.5 rounded text-sm font-semibold transition-colors
                        ${subTab === tab.id ? 'bg-surface text-accent font-semibold shadow-sm' : 'text-muted hover:text-accent'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );

    // ─── Vue : liste bibliothèque ─────────────────────────────────────────────

    const renderLibraryList = () => (
        <div className="flex flex-col gap-4">
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Rechercher un PNJ…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-base bg-surface text-base text-sm"
                />
                <button
                    onClick={openCreate}
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-accent text-base hover:bg-primary transition-colors"
                >
                    + Nouveau PNJ
                </button>
            </div>

            {tplError && (
                <div className="text-sm p-3 rounded bg-danger text-white">{tplError}</div>
            )}

            {tplLoading ? (
                <p className="text-center py-8 text-muted">Chargement…</p>
            ) : filteredTemplates.length === 0 ? (
                <p className="text-center py-8 text-muted">
                    {search ? 'Aucun résultat.' : 'Aucun template PNJ. Créez-en un !'}
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredTemplates.map(npc => (
                        <NPCCard
                            key={npc.id}
                            npc={npc}
                            renderNPCSummary={npcConfig.renderNPCSummary}
                            onView={() => openDetail(npc)}
                            onEdit={() => openEdit(npc)}
                            onDelete={() => setConfirmDeleteTpl({ id: npc.id, name: npc.name })}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    // ─── Vue : formulaire template ────────────────────────────────────────────

    const renderTemplateForm = () => (
        <div className="flex flex-col gap-4">
            <button
                onClick={goToLibrary}
                className="self-start text-sm text-muted hover:underline transition-colors"
            >
                ← Retour à la bibliothèque
            </button>

            <h2 className="text-lg font-bold text-base">
                {tplEditing ? 'Modifier le template' : 'Nouveau template PNJ'}
            </h2>

            <div className="flex flex-col gap-3">
                <TextField
                    label="Nom" required
                    value={tplForm.name}
                    onChange={v => setTplForm(p => ({ ...p, name: v }))}
                    placeholder="Nom du PNJ"
                />
                <TextField
                    label="Description" multiline
                    value={tplForm.description}
                    onChange={v => setTplForm(p => ({ ...p, description: v }))}
                    placeholder="Description narrative du PNJ…"
                />
            </div>

            {npcConfig.renderNPCForm && (
                <div className="p-3 rounded-lg border border-base bg-surface-alt">
                    <p className="text-xs font-semibold mb-3 text-muted">Données système</p>
                    {npcConfig.renderNPCForm(slugForm, handleSlugChange)}
                </div>
            )}

            {tplError2 && <p className="text-sm text-danger">{tplError2}</p>}

            <div className="flex gap-3">
                <button
                    onClick={goToLibrary}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-surface-alt hover:bg-secondary text-base"
                >
                    Annuler
                </button>
                <button
                    onClick={handleSaveTemplate}
                    disabled={tplSaving}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-bold bg-accent hover:bg-secondary text-base disabled:opacity-50"
                >
                    {tplSaving ? 'Sauvegarde…' : tplEditing ? 'Mettre à jour' : 'Créer'}
                </button>
            </div>
        </div>
    );

    // ─── Vue : détail template ────────────────────────────────────────────────

    const renderDetail = () => {
        if (!detailNpc) return null;
        const quickRolls = npcConfig.getQuickRolls ? npcConfig.getQuickRolls(detailNpc) : [];

        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                    <button
                        onClick={goToLibrary}
                        className="text-sm text-muted hover:underline transition-colors"
                    >
                        ← Bibliothèque
                    </button>
                    <button
                        onClick={() => openEdit(detailNpc)}
                        className="px-3 py-1.5 rounded text-sm font-semibold bg-surface-alt text-base"
                    >
                        ✏️ Éditer
                    </button>
                </div>

                <div>
                    <h2 className="text-xl font-bold text-base">{detailNpc.name}</h2>
                    {detailNpc.description && (
                        <p className="text-sm mt-1 text-muted">{detailNpc.description}</p>
                    )}
                </div>

                {npcConfig.renderNPCDetail && (
                    <div className="p-4 rounded-lg border border-base bg-surface">
                        {npcConfig.renderNPCDetail(detailNpc, GMDiceModal)}
                    </div>
                )}

                {quickRolls.length > 0 && (
                    <div className="p-4 rounded-lg border border-base bg-surface">
                        <h3 className="text-sm font-bold mb-3 text-muted">🎲 Jets rapides</h3>
                        <div className="flex flex-wrap gap-2">
                            {quickRolls.map((rollDef, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuickRoll(detailNpc, rollDef, idx)}
                                    disabled={rollingIdx !== null}
                                    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary text-base disabled:opacity-50 transition-colors"
                                >
                                    {rollingIdx === idx ? '⏳ Lancer…' : `🎲 ${rollDef.label}`}
                                </button>
                            ))}
                        </div>

                        {rollResult && (
                            <div className="mt-3 p-3 rounded-lg bg-surface-alt border-l-4 border-accent text-sm">
                                <span className="font-semibold text-accent">{rollResult.label}</span>
                                {' — '}
                                <span className="text-base">{rollResult.result?.total ?? '?'}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // ─── Vue : liste sets ─────────────────────────────────────────────────────

    const renderSetsList = () => {
        const filters = [
            { id: 'all',  label: 'Tous' },
            ...(sessionId ? [{ id: 'session', label: '📌 Session' }] : []),
            { id: 'free', label: '📂 Libres' },
        ];

        return (
            <div className="flex flex-col gap-4">
                <div className="flex gap-2 flex-wrap">
                    <div className="flex gap-1 p-1 rounded-lg bg-surface-alt flex-1">
                        {filters.map(f => (
                            <button
                                key={f.id}
                                onClick={() => { setSetsFilter(f.id); loadSets(f.id); }}
                                className={`flex-1 px-3 py-1 rounded text-xs font-semibold transition-colors
                                    ${setsFilter === f.id ? 'bg-surface text-accent font-semibold shadow-sm' : 'text-muted hover:text-accent'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={openCreateSet}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-accent text-base hover:bg-primary transition-colors"
                    >
                        + Nouveau set
                    </button>
                </div>

                {setsError && (
                    <div className="text-sm p-3 rounded bg-danger text-white">{setsError}</div>
                )}

                {setsLoading ? (
                    <p className="text-center py-8 text-muted">Chargement…</p>
                ) : sets.length === 0 ? (
                    <p className="text-center py-8 text-muted">
                        Aucun set. Créez-en un pour organiser vos rencontres !
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sets.map(set => (
                            <NPCSetCard
                                key={set.id}
                                set={set}
                                onView={() => openSet(set)}
                                onEdit={() => openSet(set, 'setform')}
                                onCopy={() => openSet(set, 'setcopy')}
                                onDelete={() => setConfirmDeleteSet({ id: set.id, name: set.name })}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ─── Vue : formulaire set (create / edit / copy) ──────────────────────────

    const renderSetForm = () => {
        if (!detailSet) return null;
        const isCopy = view === 'setcopy';
        const isEdit = view === 'setform' && setEditing != null;
        const title  = isCopy ? 'Copier le set' : isEdit ? 'Modifier le set' : 'Nouveau set';

        return (
            <div className="flex flex-col gap-4">
                <button
                    onClick={goToSets}
                    className="self-start text-sm text-muted hover:underline transition-colors"
                >
                    ← Retour aux sets
                </button>

                <h2 className="text-lg font-bold text-base">{title}</h2>

                <div className="flex flex-col gap-3">
                    <TextField
                        label="Nom" required
                        value={setFormData.name}
                        onChange={v => setSetFormData(p => ({ ...p, name: v }))}
                        placeholder="Nom du set"
                    />
                    <TextField
                        label="Description" multiline
                        value={setFormData.description}
                        onChange={v => setSetFormData(p => ({ ...p, description: v }))}
                        placeholder="Description de la rencontre…"
                    />

                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted">
                            Lier à la session active
                        </span>
                        <button
                            onClick={() => setSetFormData(p => ({
                                ...p,
                                session_id: p.session_id ? null : (sessionId ?? null),
                            }))}
                            disabled={!sessionId}
                            className={`px-3 py-1 rounded text-xs font-semibold disabled:opacity-40 transition-colors
                                ${setFormData.session_id ? 'bg-accent font-semibold' : 'bg-surface-alt text-muted'}`}
                        >
                            {setFormData.session_id ? '📌 Lié' : '📂 Libre'}
                        </button>
                        {!sessionId && (
                            <span className="text-xs text-muted">(aucune session active)</span>
                        )}
                    </div>
                </div>

                {setFormError && <p className="text-sm text-danger">{setFormError}</p>}

                {/* Entrées du set */}
                <div className="flex flex-col gap-2">
                    {detailSet.entries.length === 0 ? (
                        <p className="text-center py-6 text-sm text-muted">
                            Ce set est vide. Ajoutez des templates depuis la bibliothèque.
                        </p>
                    ) : (
                        detailSet.entries.map(entry => (
                            <div
                                key={entry.entry_id}
                                className="flex items-center gap-3 p-3 rounded-lg border border-base bg-surface"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-base">
                                        {entry.template.name}
                                    </p>
                                    {npcConfig.renderNPCSummary && (
                                        <div className="text-xs mt-0.5 text-muted">
                                            {npcConfig.renderNPCSummary(entry.template)}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => handleUpdateEntryQty(detailSet.id, entry.entry_id, entry.quantity - 1)}
                                        disabled={entry.quantity <= 1}
                                        className="w-7 h-7 rounded text-sm font-bold bg-surface-alt text-base disabled:opacity-30"
                                    >
                                        −
                                    </button>
                                    <span className="w-8 text-center text-sm font-bold text-base">
                                        {entry.quantity}
                                    </span>
                                    <button
                                        onClick={() => handleUpdateEntryQty(detailSet.id, entry.entry_id, entry.quantity + 1)}
                                        className="w-7 h-7 rounded text-sm font-bold bg-surface-alt text-base"
                                    >
                                        +
                                    </button>
                                </div>

                                <button
                                    onClick={() => handleRemoveEntry(detailSet.id, entry.entry_id)}
                                    className="w-7 h-7 rounded text-sm bg-surface-alt text-danger"
                                    title="Retirer du set"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Ajout depuis la bibliothèque */}
                {templates.length > 0 && (
                    <div className="p-3 rounded-lg border border-base bg-surface-alt">
                        <p className="text-xs font-semibold mb-2 text-muted">Ajouter un template</p>
                        <div className="flex flex-wrap gap-2">
                            {templates.map(tpl => (
                                <button
                                    key={tpl.id}
                                    onClick={() => handleAddTemplateToSet(detailSet.id, tpl.id)}
                                    className="px-2 py-1 rounded text-xs font-semibold bg-surface text-base hover:bg-accent transition-colors"
                                >
                                    + {tpl.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}


                <div className="flex gap-3">
                    <button
                        onClick={goToSets}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-surface-alt text-base"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={isCopy ? handleCopySet : handleSaveSet}
                        disabled={setSavingFlag}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-bold bg-accent text-base disabled:opacity-50"
                    >
                        {setSavingFlag
                            ? 'Sauvegarde…'
                            : isCopy ? 'Copier' : isEdit ? 'Mettre à jour' : 'Créer'}
                    </button>
                </div>
            </div>
        );
    };

    // ─── Vue : détail set ─────────────────────────────────────────────────────

    const renderSetDetail = () => {
        if (!detailSet) return null;

        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                    <button
                        onClick={goToSets}
                        className="text-sm text-muted hover:underline transition-colors"
                    >
                        ← Sets
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => openEditSet(detailSet)}
                            className="px-3 py-1.5 rounded text-sm font-semibold bg-surface-alt text-base"
                        >
                            ✏️ Éditer
                        </button>
                        <button
                            onClick={() => openCopySet(detailSet)}
                            className="px-3 py-1.5 rounded text-sm font-semibold bg-surface-alt text-base"
                        >
                            📋 Copier
                        </button>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-bold text-base">{detailSet.name}</h2>
                    {detailSet.description && (
                        <p className="text-sm mt-1 text-muted">{detailSet.description}</p>
                    )}
                    <p className="text-xs mt-1 text-muted">
                        {detailSet.session_id ? '📌 Lié à la session' : '📂 Set libre'}
                        {' — '}
                        {detailSet.entries.length} template{detailSet.entries.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    {detailSet.entries.length === 0 ? (
                        <p className="text-center py-6 text-sm text-muted">
                            Ce set est vide. Ajoutez des templates depuis la bibliothèque.
                        </p>
                    ) : (
                        detailSet.entries.map(entry => (
                            <div
                                key={entry.entry_id}
                                className="flex items-center gap-3 p-3 rounded-lg border border-base bg-surface"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-base">
                                        {entry.template.name}
                                    </p>
                                    {npcConfig.renderNPCSummary && (
                                        <div className="text-xs mt-0.5 text-muted">
                                            {npcConfig.renderNPCSummary(entry.template)}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="w-8 text-center text-sm font-bold text-base">
                                        {entry.quantity}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        );
    };

    // ─── Rendu principal ──────────────────────────────────────────────────────

    return (
        <div className="p-4 flex flex-col gap-2">
            {/* Sous-onglets — affichés sur toutes les vues "list" */}
            {(view === 'list' || view === 'setlist') && renderSubTabs()}

            {/* Bibliothèque */}
            {subTab === 'library' && view === 'list'   && renderLibraryList()}
            {subTab === 'library' && view === 'form'   && renderTemplateForm()}
            {subTab === 'library' && view === 'detail' && renderDetail()}

            {/* Sets */}
            {subTab === 'sets' && view === 'setlist'                              && renderSetsList()}
            {subTab === 'sets' && (view === 'setform' || view === 'setcopy')     && renderSetForm()}
            {subTab === 'sets' && view === 'setdetail'                            && renderSetDetail()}

            {/* Modales de confirmation */}
            {confirmDeleteTpl && (
                <ConfirmModal
                    title="Supprimer le template"
                    message={`Supprimer « ${confirmDeleteTpl.name} » ? Cette action est irréversible.`}
                    confirmText="Supprimer"
                    danger
                    onConfirm={() => handleDeleteTemplate(confirmDeleteTpl.id)}
                    onCancel={() => setConfirmDeleteTpl(null)}
                />
            )}
            {confirmDeleteSet && (
                <ConfirmModal
                    title="Supprimer le set"
                    message={`Supprimer « ${confirmDeleteSet.name} » ? Les entrées seront supprimées.`}
                    confirmText="Supprimer"
                    danger
                    onConfirm={() => handleDeleteSet(confirmDeleteSet.id)}
                    onCancel={() => setConfirmDeleteSet(null)}
                />
            )}
        </div>
    );
};

export default TabNPC;