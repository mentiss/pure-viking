// src/client/src/systems/deltagreen/config.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuration CLIENT du système Delta Green (BRP percentile D100).
// Point d'entrée unique pour tout ce qui est spécifique au système côté client :
//   - Métadonnées slug
//   - Hooks diceEngine v2
//   - Données statiques : compétences de base, professions, situations SAN, tags GM
//   - Defaults dés
//
// ⚠️  Aucun lien avec src/server/systems/deltagreen/config.js (Node.js).
//     Ce fichier est un module ES, importé uniquement par le frontend React.
// ─────────────────────────────────────────────────────────────────────────────

import { RollError } from '../../tools/diceEngine.js';
import DiceEntryHistory from "./components/layout/DiceEntryHistory.jsx";

// ══════════════════════════════════════════════════════════════════════════════
// DONNÉES STATIQUES
// ══════════════════════════════════════════════════════════════════════════════

// ── Compétences de base ───────────────────────────────────────────────────────
// Ordre : ordre d'affichage sur la fiche officielle DD 315.
// hasSpecialty : peut avoir des lignes de spécialité en plus de la base.
// base : score de départ (avant points de profession / bonus).

export const BASE_SKILLS = [
    { key: 'anthropologie',     label: 'Anthropologie',       base: 0,  hasSpecialty: false },
    { key: 'archeologie',       label: 'Archéologie',         base: 0,  hasSpecialty: false },
    { key: 'armes_feu',         label: 'Armes à feu',         base: 20, hasSpecialty: false },
    { key: 'armes_melee',       label: 'Armes de mêlée',      base: 30, hasSpecialty: false },
    { key: 'armes_lourdes',     label: 'Armes lourdes',       base: 0,  hasSpecialty: false },
    { key: 'art',               label: 'Art',                 base: 0,  hasSpecialty: true  },
    { key: 'artillerie',        label: 'Artillerie',          base: 0,  hasSpecialty: false },
    { key: 'artisanat',         label: 'Artisanat',           base: 0,  hasSpecialty: true  },
    { key: 'athletisme',        label: 'Athlétisme',          base: 30, hasSpecialty: false },
    { key: 'bureaucratie',      label: 'Bureaucratie',        base: 10, hasSpecialty: false },
    { key: 'chirurgie',         label: 'Chirurgie',           base: 0,  hasSpecialty: false },
    { key: 'combat_mains_nues', label: 'Combat à mains nues', base: 40, hasSpecialty: false },
    { key: 'comptabilite',      label: 'Comptabilité',        base: 10, hasSpecialty: false },
    { key: 'conduite',          label: 'Conduite',            base: 20, hasSpecialty: false },
    { key: 'criminalistique',   label: 'Criminalistique',     base: 0,  hasSpecialty: false },
    { key: 'criminologie',      label: 'Criminologie',        base: 10, hasSpecialty: false },
    { key: 'deguisement',       label: 'Déguisement',         base: 10, hasSpecialty: false },
    { key: 'discretion',        label: 'Discrétion',          base: 10, hasSpecialty: false },
    { key: 'droit',             label: 'Droit',               base: 0,  hasSpecialty: false },
    { key: 'engins_lourds',     label: 'Engins lourds',       base: 10, hasSpecialty: false },
    { key: 'equitation',        label: 'Équitation',          base: 10, hasSpecialty: false },
    { key: 'esquive',           label: 'Esquive',             base: 30, hasSpecialty: false },
    { key: 'explosifs',         label: 'Explosifs',           base: 0,  hasSpecialty: false },
    { key: 'histoire',          label: 'Histoire',            base: 10, hasSpecialty: false },
    { key: 'inconcevable',      label: 'Inconcevable',        base: 0,  hasSpecialty: false },
    { key: 'informatique',      label: 'Informatique',        base: 0,  hasSpecialty: false },
    { key: 'medecine',          label: 'Médecine',            base: 0,  hasSpecialty: false },
    { key: 'natation',          label: 'Natation',            base: 20, hasSpecialty: false },
    { key: 'occultisme',        label: 'Occultisme',          base: 10, hasSpecialty: false },
    { key: 'orientation',       label: 'Orientation',         base: 10, hasSpecialty: false },
    { key: 'persuasion',        label: 'Persuasion',          base: 20, hasSpecialty: false },
    { key: 'pharmacologie',     label: 'Pharmacologie',       base: 0,  hasSpecialty: false },
    { key: 'pilotage',          label: 'Pilotage',            base: 0,  hasSpecialty: true  },
    { key: 'premiers_secours',  label: 'Premiers secours',    base: 10, hasSpecialty: false },
    { key: 'psychotherapie',    label: 'Psychothérapie',      base: 10, hasSpecialty: false },
    { key: 'recherche',         label: 'Recherche',           base: 20, hasSpecialty: false },
    { key: 'rohum',             label: 'ROHUM',               base: 10, hasSpecialty: false },
    { key: 'roem',              label: 'ROEM',                base: 0,  hasSpecialty: false },
    { key: 'science',           label: 'Science',             base: 0,  hasSpecialty: true  },
    { key: 'sciences_mili',     label: 'Sciences militaires', base: 0,  hasSpecialty: true  },
    { key: 'survie',            label: 'Survie',              base: 10, hasSpecialty: false },
    { key: 'vigilance',         label: 'Vigilance',           base: 20, hasSpecialty: false },
];

// ── Lookup rapide par clé ─────────────────────────────────────────────────────
export const SKILL_BY_KEY = Object.fromEntries(BASE_SKILLS.map(s => [s.key, s]));

// ── Situations de perte de SAN ────────────────────────────────────────────────
// success / failure : notations texte ('0', '1', '1D4', '1D6', '1D8', '1D10')
// category : groupe d'affichage dans la modale

export const SAN_SITUATIONS = [
    // ── Violence — victime ────────────────────────────────────────────────────
    { category: 'violence_victime', label: 'Être pris dans une fusillade',                    success: '0', failure: '1'    },
    { category: 'violence_victime', label: 'Trouver un cadavre',                              success: '0', failure: '1'    },
    { category: 'violence_victime', label: "Trouver le cadavre d'un être cher",               success: '0', failure: '1D4'  },
    { category: 'violence_victime', label: 'Se faire poignarder ou étrangler par surprise',   success: '0', failure: '1D4'  },
    { category: 'violence_victime', label: 'Être réduit à 2 PV ou moins',                    success: '0', failure: '1D6'  },
    { category: 'violence_victime', label: 'Se faire torturer',                               success: '0', failure: '1D10' },

    // ── Violence — auteur ─────────────────────────────────────────────────────
    { category: 'violence_auteur',  label: 'Immobiliser ou estropier un innocent',            success: '0', failure: '1D4'  },
    { category: 'violence_auteur',  label: 'Mettre des corps dans un incinérateur',           success: '0', failure: '1D4'  },
    { category: 'violence_auteur',  label: 'Tuer pour se défendre',                           success: '0', failure: '1D4'  },
    { category: 'violence_auteur',  label: 'Tuer un assassin de sang-froid',                  success: '0', failure: '1D6'  },
    { category: 'violence_auteur',  label: 'Torturer une victime',                            success: '0', failure: '1D8'  },
    { category: 'violence_auteur',  label: 'Tuer accidentellement un innocent',               success: '0', failure: '1D8'  },
    { category: 'violence_auteur',  label: 'Tuer un innocent de sang-froid',                  success: '1', failure: '1D10' },

    // ── Impuissance ───────────────────────────────────────────────────────────
    { category: 'impuissance',      label: 'Être licencié',                                   success: '0', failure: '1'    },
    { category: 'impuissance',      label: "Un ami souffre d'une blessure permanente",        success: '0', failure: '1'    },
    { category: 'impuissance',      label: "Le score d'une Attache tombe à 0",                success: '0', failure: '1D4'  },
    { category: 'impuissance',      label: 'Être condamné à une peine de prison',             success: '0', failure: '1D4'  },
    { category: 'impuissance',      label: 'Se réveiller aveugle ou paralysé',                success: '0', failure: '1D4'  },
    { category: 'impuissance',      label: "Découvrir la dépouille d'un ami",                 success: '0', failure: '1D4'  },
    { category: 'impuissance',      label: 'Atterrir dans une fosse de cadavres',             success: '0', failure: '1D4'  },
    { category: 'impuissance',      label: "Une Attache souffre d'une blessure permanente",   success: '1', failure: '1D4'  },
    { category: 'impuissance',      label: "Voir ou entendre un ami subir une mort atroce",   success: '0', failure: '1D6'  },
    { category: 'impuissance',      label: "Mort d'une Attache",                              success: '1', failure: '1D6'  },
    { category: 'impuissance',      label: "Voir ou entendre une Attache subir une mort atroce", success: '1', failure: '1D8' },

    // ── L'Inconcevable ────────────────────────────────────────────────────────
    { category: 'inconcevable',     label: "Utiliser Psychothérapie sur un personnage affecté par l'Inconcevable", success: '0', failure: '1'   },
    { category: 'inconcevable',     label: 'Être témoin d\'un phénomène surnaturel bénin',    success: '0', failure: '1'   },
    { category: 'inconcevable',     label: 'Être témoin d\'un phénomène surnaturel violent',  success: '0', failure: '1D6' },
    { category: 'inconcevable',     label: 'Voir un cadavre se déplacer',                     success: '0', failure: '1D6' },
    { category: 'inconcevable',     label: 'Subir un effet ouvertement surnaturel',           success: '0', failure: '1D6' },
    { category: 'inconcevable',     label: 'Subir un assaut surnaturel violent',              success: '1', failure: '1D8' },
];

// Labels des catégories de situations
export const SAN_CATEGORIES = {
    violence_victime: 'Violence — Victime',
    violence_auteur:  'Violence — Auteur',
    impuissance:      'Impuissance',
    inconcevable:     "L'Inconcevable",
};

// ── Professions ───────────────────────────────────────────────────────────────
// Chaque profession liste les compétences préremplies au score indiqué.
// choices : blocs de compétences optionnelles (le joueur choisit N parmi la liste).
// bondsCount : nombre d'Attaches.

export const PROFESSIONS = [
    {
        key:        'anthropologue',
        label:      'Anthropologue / Historien',
        bondsCount: 4,
        recommended: ['int'],
        skills: [
            { key: 'bureaucratie', score: 40 },
            { key: 'histoire',     score: 60 },
            { key: 'occultisme',   score: 40 },
            { key: 'persuasion',   score: 40 },
        ],
        skillsOr: [
            { pick: 1, options: [
                    { key: 'anthropologie', score: 50 },
                    { key: 'archeologie',   score: 50 },
                ]},
        ],
        choices: [
            { pick: 2, options: [
                    { key: 'anthropologie', score: 40 },
                    { key: 'archeologie',   score: 40 },
                    { key: 'rohum',         score: 50 },
                    { key: 'orientation',   score: 50 },
                    { key: 'equitation',    score: 50 },
                    { key: 'recherche',     score: 60 },
                    { key: 'survie',        score: 50 },
                ]},
        ],
        languages: 2, // Langues étrangères imposées
    },
    {
        key:        'informaticien',
        label:      'Informaticien / Ingénieur',
        bondsCount: 3,
        recommended: ['int'],
        skills: [
            { key: 'informatique', score: 60 },
            { key: 'roem',         score: 40 },
        ],
        specialties: [
            { key: 'artisanat', specialty: 'Électricien',      score: 30 },
            { key: 'artisanat', specialty: 'Mécanicien',       score: 30 },
            { key: 'artisanat', specialty: 'Microélectronique',score: 40 },
            { key: 'science',   specialty: 'Mathématiques',    score: 40 },
        ],
        choices: [
            { pick: 4, options: [
                    { key: 'comptabilite', score: 50 },
                    { key: 'bureaucratie', score: 50 },
                    { key: 'engins_lourds',score: 50 },
                    { key: 'droit',        score: 40 },
                ]},
        ],
    },
    {
        key:        'agent_federal',
        label:      'Agent fédéral',
        bondsCount: 3,
        recommended: ['con', 'pow', 'cha'],
        skills: [
            { key: 'vigilance',      score: 50 },
            { key: 'bureaucratie',   score: 40 },
            { key: 'criminologie',   score: 50 },
            { key: 'conduite',       score: 50 },
            { key: 'armes_feu',      score: 50 },
            { key: 'criminalistique',score: 30 },
            { key: 'rohum',          score: 60 },
            { key: 'droit',          score: 30 },
            { key: 'persuasion',     score: 50 },
            { key: 'recherche',      score: 50 },
            { key: 'combat_mains_nues', score: 60 },
        ],
        choices: [
            { pick: 1, options: [
                    { key: 'comptabilite',  score: 60 },
                    { key: 'informatique',  score: 50 },
                    { key: 'armes_lourdes', score: 50 },
                    { key: 'pharmacologie', score: 50 },
                ]},
        ],
    },
    {
        key:        'medecin',
        label:      'Médecin',
        bondsCount: 3,
        recommended: ['int', 'pow', 'dex'],
        skills: [
            { key: 'bureaucratie',   score: 50 },
            { key: 'premiers_secours', score: 60 },
            { key: 'medecine',       score: 60 },
            { key: 'persuasion',     score: 40 },
            { key: 'pharmacologie',  score: 50 },
            { key: 'recherche',      score: 40 },
        ],
        specialties: [
            { key: 'science', specialty: 'Biologie', score: 60 },
        ],
        choices: [
            { pick: 2, options: [
                    { key: 'criminalistique', score: 50 },
                    { key: 'psychotherapie',  score: 60 },
                    { key: 'chirurgie',       score: 50 },
                ]},
        ],
    },
    {
        key:        'scientifique',
        label:      'Scientifique',
        bondsCount: 4,
        recommended: ['int'],
        skills: [
            { key: 'bureaucratie', score: 40 },
            { key: 'informatique', score: 40 },
        ],
        specialtiesFixed: [
            { key: 'science', specialty: null,    score: 60, pick: true, label: 'Science (choix)' },
            { key: 'science', specialty: null,    score: 50, pick: true, label: 'Science (autre)' },
            { key: 'science', specialty: null,    score: 50, pick: true, label: 'Science (autre)' },
        ],
        choices: [
            { pick: 3, options: [
                    { key: 'comptabilite',  score: 50 },
                    { key: 'criminalistique', score: 40 },
                    { key: 'droit',         score: 40 },
                    { key: 'pharmacologie', score: 40 },
                ]},
        ],
    },
    {
        key:        'forces_speciales',
        label:      'Opérateur forces spéciales',
        bondsCount: 2,
        recommended: ['str', 'con', 'pow'],
        skills: [
            { key: 'vigilance',      score: 60 },
            { key: 'athletisme',     score: 60 },
            { key: 'explosifs',      score: 40 },
            { key: 'armes_feu',      score: 60 },
            { key: 'armes_lourdes',  score: 50 },
            { key: 'armes_melee',    score: 50 },
            { key: 'orientation',    score: 50 },
            { key: 'discretion',     score: 50 },
            { key: 'survie',         score: 50 },
            { key: 'natation',       score: 50 },
            { key: 'combat_mains_nues', score: 60 },
        ],
        specialties: [
            { key: 'sciences_mili', specialty: 'Terrestre', score: 60 },
        ],
        choices: [],
    },
    {
        key:        'criminel',
        label:      'Criminel',
        bondsCount: 4,
        recommended: ['str', 'dex'],
        skills: [
            { key: 'vigilance',    score: 50 },
            { key: 'criminologie', score: 60 },
            { key: 'esquive',      score: 40 },
            { key: 'conduite',     score: 50 },
            { key: 'armes_feu',    score: 40 },
            { key: 'droit',        score: 40 },
            { key: 'armes_melee',  score: 40 },
            { key: 'persuasion',   score: 50 },
            { key: 'discretion',   score: 50 },
            { key: 'combat_mains_nues', score: 50 },
        ],
        choices: [
            { pick: 2, options: [
                    { key: 'explosifs',     score: 40 },
                    { key: 'deguisement',   score: 50 },
                    { key: 'criminalistique', score: 40 },
                    { key: 'rohum',         score: 50 },
                    { key: 'orientation',   score: 50 },
                    { key: 'occultisme',    score: 50 },
                    { key: 'pharmacologie', score: 40 },
                ]},
        ],
    },
    {
        key:        'pompier',
        label:      'Pompier',
        bondsCount: 3,
        recommended: ['str', 'dex', 'con'],
        skills: [
            { key: 'vigilance',       score: 50 },
            { key: 'athletisme',      score: 60 },
            { key: 'explosifs',       score: 50 },
            { key: 'conduite',        score: 50 },
            { key: 'premiers_secours',score: 50 },
            { key: 'criminalistique', score: 40 },
            { key: 'engins_lourds',   score: 50 },
            { key: 'orientation',     score: 50 },
            { key: 'recherche',       score: 40 },
        ],
        specialties: [
            { key: 'artisanat', specialty: 'Électricien', score: 40 },
            { key: 'artisanat', specialty: 'Mécanicien',  score: 40 },
        ],
        choices: [],
    },
    {
        key:        'affaires_etrangeres',
        label:      'Agent des affaires étrangères',
        bondsCount: 3,
        recommended: ['int', 'cha'],
        skills: [
            { key: 'comptabilite', score: 40 },
            { key: 'anthropologie',score: 40 },
            { key: 'bureaucratie', score: 60 },
            { key: 'histoire',     score: 40 },
            { key: 'rohum',        score: 50 },
            { key: 'droit',        score: 40 },
            { key: 'persuasion',   score: 50 },
        ],
        languages: 3,
        choices: [],
    },
    {
        key:        'analyste_renseignement',
        label:      'Analyste du renseignement',
        bondsCount: 3,
        recommended: ['int'],
        skills: [
            { key: 'anthropologie', score: 40 },
            { key: 'bureaucratie',  score: 50 },
            { key: 'informatique',  score: 40 },
            { key: 'criminologie',  score: 40 },
            { key: 'histoire',      score: 40 },
            { key: 'rohum',         score: 50 },
            { key: 'roem',          score: 40 },
        ],
        languages: 3,
        choices: [],
    },
    {
        key:        'officier_traitant',
        label:      'Officier traitant du renseignement',
        bondsCount: 2,
        recommended: ['int', 'pow', 'cha'],
        skills: [
            { key: 'vigilance',    score: 50 },
            { key: 'bureaucratie', score: 40 },
            { key: 'criminologie', score: 50 },
            { key: 'deguisement',  score: 50 },
            { key: 'conduite',     score: 40 },
            { key: 'armes_feu',    score: 40 },
            { key: 'rohum',        score: 60 },
            { key: 'persuasion',   score: 60 },
            { key: 'roem',         score: 40 },
            { key: 'discretion',   score: 50 },
            { key: 'combat_mains_nues', score: 50 },
        ],
        languages: 2,
        choices: [],
    },
    {
        key:        'avocat',
        label:      'Avocat / Dirigeant d\'entreprise',
        bondsCount: 4,
        recommended: ['int', 'cha'],
        skills: [
            { key: 'comptabilite', score: 50 },
            { key: 'bureaucratie', score: 50 },
            { key: 'rohum',        score: 40 },
            { key: 'persuasion',   score: 60 },
        ],
        choices: [
            { pick: 4, options: [
                    { key: 'informatique', score: 50 },
                    { key: 'criminologie', score: 60 },
                    { key: 'droit',        score: 50 },
                    { key: 'pharmacologie',score: 50 },
                ]},
        ],
    },
    {
        key:        'medias',
        label:      'Spécialiste médias',
        bondsCount: 4,
        recommended: ['int', 'cha'],
        skills: [
            { key: 'histoire',  score: 40 },
            { key: 'rohum',     score: 40 },
            { key: 'persuasion',score: 50 },
        ],
        specialtiesFixed: [
            { key: 'art', specialty: null, score: 60, pick: true, label: 'Art (Écriture, Journalisme…)' },
        ],
        choices: [
            { pick: 5, options: [
                    { key: 'anthropologie', score: 40 },
                    { key: 'archeologie',   score: 40 },
                    { key: 'bureaucratie',  score: 50 },
                    { key: 'informatique',  score: 40 },
                    { key: 'criminologie',  score: 50 },
                    { key: 'droit',         score: 40 },
                    { key: 'occultisme',    score: 50 },
                ]},
        ],
    },
    {
        key:        'infirmier',
        label:      'Infirmier / Ambulancier',
        bondsCount: 4,
        recommended: ['int', 'pow', 'cha'],
        skills: [
            { key: 'vigilance',      score: 40 },
            { key: 'bureaucratie',   score: 40 },
            { key: 'premiers_secours', score: 60 },
            { key: 'rohum',          score: 40 },
            { key: 'medecine',       score: 40 },
            { key: 'persuasion',     score: 40 },
            { key: 'pharmacologie',  score: 40 },
        ],
        specialties: [
            { key: 'science', specialty: 'Biologie', score: 40 },
        ],
        choices: [
            { pick: 2, options: [
                    { key: 'conduite',      score: 60 },
                    { key: 'criminalistique', score: 40 },
                    { key: 'orientation',   score: 50 },
                    { key: 'psychotherapie',score: 50 },
                    { key: 'recherche',     score: 60 },
                ]},
        ],
    },
    {
        key:        'pilote',
        label:      'Pilote / Marin',
        bondsCount: 3,
        recommended: ['dex', 'int'],
        skills: [
            { key: 'vigilance',  score: 60 },
            { key: 'bureaucratie', score: 30 },
            { key: 'orientation',score: 50 },
            { key: 'natation',   score: 40 },
        ],
        specialties: [
            { key: 'artisanat', specialty: 'Électricien', score: 40 },
            { key: 'artisanat', specialty: 'Mécanicien',  score: 40 },
        ],
        specialtiesFixed: [
            { key: 'pilotage', specialty: null, score: 60, pick: true, label: 'Pilotage (choix)' },
        ],
        choices: [
            { pick: 2, options: [
                    { key: 'armes_lourdes', score: 50 },
                ]},
        ],
    },
    {
        key:        'officier_police',
        label:      'Officier de police',
        bondsCount: 3,
        recommended: ['str', 'con', 'pow'],
        skills: [
            { key: 'vigilance',    score: 60 },
            { key: 'bureaucratie', score: 40 },
            { key: 'criminologie', score: 40 },
            { key: 'conduite',     score: 50 },
            { key: 'armes_feu',    score: 40 },
            { key: 'premiers_secours', score: 30 },
            { key: 'rohum',        score: 50 },
            { key: 'droit',        score: 30 },
            { key: 'armes_melee',  score: 50 },
            { key: 'orientation',  score: 40 },
            { key: 'persuasion',   score: 40 },
            { key: 'recherche',    score: 40 },
            { key: 'combat_mains_nues', score: 60 },
        ],
        choices: [
            { pick: 1, options: [
                    { key: 'criminalistique', score: 50 },
                    { key: 'engins_lourds',   score: 60 },
                    { key: 'armes_lourdes',   score: 50 },
                    { key: 'equitation',      score: 60 },
                ]},
        ],
    },
    {
        key:        'directeur_programme',
        label:      'Directeur de programme',
        bondsCount: 4,
        recommended: ['int', 'cha'],
        skills: [
            { key: 'comptabilite', score: 60 },
            { key: 'bureaucratie', score: 60 },
            { key: 'informatique', score: 50 },
            { key: 'criminologie', score: 30 },
            { key: 'histoire',     score: 40 },
            { key: 'droit',        score: 40 },
            { key: 'persuasion',   score: 50 },
        ],
        languages: 1,
        choices: [
            { pick: 1, options: [
                    { key: 'anthropologie', score: 30 },
                ]},
        ],
    },
    {
        key:        'soldat',
        label:      'Soldat / Marine',
        bondsCount: 4,
        recommended: ['str', 'con'],
        skills: [
            { key: 'vigilance',    score: 50 },
            { key: 'athletisme',   score: 50 },
            { key: 'bureaucratie', score: 30 },
            { key: 'conduite',     score: 40 },
            { key: 'armes_feu',    score: 40 },
            { key: 'premiers_secours', score: 40 },
            { key: 'orientation',  score: 40 },
            { key: 'persuasion',   score: 30 },
            { key: 'combat_mains_nues', score: 50 },
        ],
        specialties: [
            { key: 'sciences_mili', specialty: 'Terrestre', score: 40 },
        ],
        choices: [
            { pick: 3, options: [
                    { key: 'artillerie',   score: 40 },
                    { key: 'informatique', score: 40 },
                    { key: 'explosifs',    score: 40 },
                    { key: 'engins_lourds',score: 50 },
                    { key: 'armes_lourdes',score: 40 },
                    { key: 'recherche',    score: 60 },
                    { key: 'roem',         score: 40 },
                    { key: 'natation',     score: 60 },
                ]},
        ],
    },
    {
        key:        'personnalise',
        label:      'Profession personnalisée',
        bondsCount: 3, // modifiable : -1 Bond = +50 pts, +1 Bond = -50 pts
        recommended: [],
        skills:     [],
        choices:    [],
        custom:     true, // flag : wizard affiche l'interface de personnalisation
    },
];

// ── Tags GM prédéfinis ────────────────────────────────────────────────────────
// Structure : { key, label, color (text), bgColor (background) }

export const GM_TAGS = [
    { key: 'epuise',         label: 'Épuisé',             color: '#92400e', bgColor: '#fef3c7' },
    { key: 'vol_bas',        label: 'VOL bas',            color: '#1e40af', bgColor: '#dbeafe' },
    { key: 'insomnie',       label: 'Insomnie',           color: '#4b5563', bgColor: '#f3f4f6' },
    { key: 'stimulants',     label: 'Stimulants',         color: '#065f46', bgColor: '#d1fae5' },
    { key: 'blesse',         label: 'Blessé',             color: '#991b1b', bgColor: '#fee2e2' },
    { key: 'adapte_violence',label: 'Adapté Violence',    color: '#1e3a5f', bgColor: '#e0f2fe' },
    { key: 'adapte_impu',    label: 'Adapté Impuissance', color: '#3b0764', bgColor: '#f3e8ff' },
    { key: 'sous_traitement',label: 'Sous traitement',    color: '#064e3b', bgColor: '#ecfdf5' },
    { key: 'surveille',      label: 'Surveillé',          color: '#78350f', bgColor: '#fff7ed' },
];

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION DU SYSTÈME
// ══════════════════════════════════════════════════════════════════════════════

const deltgreenConfig = {
    slug:  'deltagreen',
    label: 'Delta Green',

    // ── Bloc dés (diceEngine v2) ──────────────────────────────────────────────
    dice: {

        // 1. buildNotation(ctx) → string
        //    Delta Green : D100 pour les compétences/caractéristiques.
        //    Les jets de dommages (D4, D6, etc.) passent en notation directe.
        buildNotation: (ctx) => {
            const { diceType } = ctx.systemData;
            if (!diceType) throw new RollError('NO_DICE', 'Type de dé non spécifié');
            return `1${diceType}`;
            // Ex: '1d100' pour compétence/carac, '1d6' pour dommages
        },

        // 2. beforeRoll(ctx) → ctx
        //    Validation légère — le score cible est dans ctx.systemData.
        beforeRoll: (ctx) => {
            const { diceType } = ctx.systemData;
            const allowed = ['d100', 'd4', 'd6', 'd8', 'd10', 'd12'];
            if (!allowed.includes(diceType)) {
                throw new RollError('INVALID_DICE', `Type de dé invalide : ${diceType}`);
            }
            return ctx;
        },

        // 3. afterRoll(raw, ctx) → result
        //    D100 : succès si résultat ≤ score cible.
        //    Jets de dommages : retourne le total brut.
        // config.jsx — afterRoll corrigé
        afterRoll: (raw, ctx) => {
            const { diceType, targetScore, rollLabel } = ctx.systemData;
            const value = raw.groups[0].total;

            if (diceType === 'd100') {
                const tens  = value === 100 ? 0 : Math.floor(value / 10) * 10;
                const units = value % 10;
                const computed = (tens + units) === 0 ? 100 : (tens + units);
                const success    = computed <= (targetScore ?? 0);
                const tensDigit  = Math.floor(computed / 10) % 10;
                const unitsDigit = computed % 10;
                const critical   = tensDigit === unitsDigit && computed !== 100;
                const fumble     = computed === 100 || (critical && !success);

                return {
                    value:       computed,
                    allDice:     [computed],          // ← pour le renderer générique
                    targetScore: targetScore ?? 0,
                    success,
                    critical:    critical && success,
                    fumble,
                    rollLabel:   rollLabel ?? '',
                    successes:   success ? 1 : 0,
                };
            }

            return {
                value,
                allDice:   [value],                   // ← pour le renderer générique
                diceType,
                rollLabel: rollLabel ?? 'Dommages',
                successes: 0,
            };
        },


        // 4. buildAnimationSequence(raw, ctx, result) → AnimationSequence | null
        buildAnimationSequence: (raw, ctx, result) => {
            const { diceType } = ctx.systemData;
            return {
                mode: 'single',
                groups: [{
                    id: 'main',
                    diceType: diceType === 'd100' ? '1d100+1d10' : diceType,
                    label:  ctx.systemData.rollLabel ?? '',
                    waves: [{dice: diceType === 'd100'
                            ? (() => {
                                const v = raw.groups[0].values[0];
                                return [v === 100 ? 0 : Math.floor(v/10)*10, v%10];
                            })()
                            : raw.groups[0].values
                    }]
                }],
            };
        },

        // 5. renderHistoryEntry — null : rendu générique plateforme suffisant
        renderHistoryEntry: (entry) => <DiceEntryHistory roll={entry} />,
    },

    // ── Bloc combat — stub (pas de TabCombat en v1) ───────────────────────────
    combat: {
        actionsMax: 0,

        renderNPCForm:        null,
        buildNPCCombatStats:  null,
        parseNPCCombatStats:  null,
        buildNPCHealthData:   null,
        getNPCRollContext:     null,
    },
    diceConfigDefault: {
        mode:   'custom',
        preset: null,
        custom: {
            foreground: '#e8e6d1', // Couleur papier jauni / texte de machine à écrire
            background: '#1a241e', // Vert sapin très sombre (militaire/forêt)
            outline:    '#7a1a1a', // Rouge sang séché / tampon "Top Secret"
            edge:       '#0d0d0d', // Noir pur pour la profondeur
            texture:    'glass',   // Ou 'cloudy' si disponible pour un effet usé
            material:   'plastic', // Plus proche des dés de JDR classiques ou bakélite
        },
        lightColor:       '#c2ffb8', // Une lueur verdâtre faible (type vision nocturne)
        strength:         5,
        gravity:          600,       // Gravité plus lourde pour un sentiment de fatalité
        sounds:           true,      // Le bruit des dés est crucial pour la tension
        animationEnabled: true,
    },
};

export default deltgreenConfig;