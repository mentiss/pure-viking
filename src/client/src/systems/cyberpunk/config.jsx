// src/client/src/systems/cyberpunk/config.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuration frontend du slug Cyberpunk (The Sprawl — adaptation 2d10).
//
// Contrat diceEngine v2 :
//   - buildNotation(ctx) → string   (appelé par le composant, pas le moteur)
//   - beforeRoll(ctx)    → ctx enrichi
//   - afterRoll(raw, ctx)→ result
//   - buildAnimationSequence(raw, ctx, result) → AnimationSequence
//   - renderHistoryEntry(entry) → JSX | null
//
// Système de résolution 2d10 + modificateur :
//   15+    → succès plein
//   10-14  → succès partiel
//   9-     → échec
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import DiceEntryHistory from "./components/layout/DiceEntryHistory.jsx";

// ── Constantes ────────────────────────────────────────────────────────────────

const SEUIL_SUCCES  = 15;
const SEUIL_PARTIEL = 10;

// Couleur par stat pour l'animation
const STAT_COLOR = {
    cran:   'magenta',
    pro:    'cyan',
    chair:  'orange',
    esprit: 'purple',
    style:  'amber',
    synth:  'green',
    cred:   'gold',
    null:   'default',
};

// Label court des stats pour l'affichage
const STAT_LABEL = {
    cran:   'Cran',
    pro:    'Pro',
    chair:  'Chair',
    esprit: 'Esprit',
    style:  'Style',
    synth:  'Synth',
    cred:   'Cred',
};

export const OUTCOME_LABEL = {
    success: 'Succès plein',
    partial: 'Succès partiel',
    failure: 'Échec',
};

export const OUTCOME_CLASS = {
    success: 'cp-outcome-success',
    partial: 'cp-outcome-partial',
    failure: 'cp-outcome-failure',
};

export const CYBERWARE_ALL = [
    {
        name:        'Armement incorporé',
        description: 'Armes dissimulées ou rétractables implantées directement dans le corps.',
        optionHint:  'Lames rétractables · Arme à feu cachée · Fouet à monofilament · Implant interne d\'assassinat',
    },
    {
        name:        'Sous-derme',
        description: 'Plaques hypodermiques d\'armure synthétique. Réduit les conséquences physiques graves — soustrait 2 aux jets de blessure mortelle.',
        optionHint:  null,
    },
    {
        name:        'Bras cybernétique',
        description: 'Membre de remplacement allant de la prothèse esthétique à l\'amélioration réelle.',
        optionHint:  'Force augmentée · Outils intégrés · Arme intégrée',
    },
    {
        name:        'Skilljam',
        description: 'Système expert cérébral avec ports pour puces de compétence. Démarre avec 2 puces, 2 ports disponibles.',
        optionHint:  'Ex : arts martiaux · crochetage · escalade · armes à feu · conduite extrême',
    },
    {
        name:        'Neuralink comm',
        description: 'Communications internes par impulsions mentales. Permet de lancer 2d10+Synth pour Évaluer en situation tactique.',
        optionHint:  '+brouillage · +relais satellite · +enregistrement · +crypté · +partition inaccessible (choisis 2)',
    },
    {
        name:        'Greffe musculaire',
        description: 'Fibres synthétiques greffées dans les muscles. Permet de lancer 2d10+Synth au lieu de Chair pour Employer la manière forte.',
        optionHint:  null,
    },
    {
        name:        'Interface neurale',
        description: 'Interface cérébrale reliant impulsions nerveuses et appareils configurés. Ouvre les Manœuvres du Net et Seconde peau.',
        optionHint:  'Logiciel de visée · Module de contrôle à distance · Stockage de données',
    },
    {
        name:        'Jambes cybernétiques',
        description: 'Membres de remplacement avec capacités athlétiques augmentées. +1 sur Agir sous pression si les jambes peuvent aider.',
        optionHint:  null,
    },
    {
        name:        'Réflexes câblés',
        description: 'Remplacement partiel du système nerveux. +1 sur le prochain jet si aucun adversaire ne dispose de nerfs synthétiques.',
        optionHint:  null,
    },
    {
        name:        'Oreilles cybernétiques',
        description: 'Oreilles de remplacement avec capacités auditives augmentées. Permet de lancer 2d10+Synth pour Évaluer.',
        optionHint:  '+atténuation · +gamme de fréquences · +enregistrement · +crypté · +partition inaccessible (choisis 2)',
    },
    {
        name:        'Processeur tactique',
        description: 'Système expert calculant distance, environnement et mouvement. Gagne 1 retenue supplémentaire sur Évaluer, même sur un raté.',
        optionHint:  null,
    },
    {
        name:        'Yeux cybernétiques',
        description: 'Yeux de remplacement avec capacités visuelles augmentées. Permet de lancer 2d10+Synth pour Évaluer.',
        optionHint:  '+thermographique · +amplification lumineuse · +zoom · +anti-flash · +enregistrement · +crypté · +partition inaccessible (choisis 2)',
    },
    {
        name:        'Sandevistan',
        description: 'Boost de réflexes neural qui dilate la perception du temps. Une fois par scène : esquive auto ou action supplémentaire simple.',
        optionHint:  null,
    },
    {
        name:        'Kerenzikov',
        description: 'Booster neural pour enchaîner les gestes avec précision surhumaine. Une fois par scène : déclenche un move simple en même temps qu\'Employer la manière forte.',
        optionHint:  null,
    },
    {
        name:        'Braindance Recorder',
        description: 'Implant d\'enregistrement sensoriel complet. Déclare que tu enregistres → gagne automatiquement [info] exploitable.',
        optionHint:  null,
    },
    {
        name:        'Slice \'N Dice',
        description: 'Fil de monofilament rétractable dans les doigts ou le poignet. (3-dégâts +contact +carnage +discret +implant)',
        optionHint:  null,
    },
    {
        name:        'Cyberdeck intégré',
        description: 'Version implantée du Cyberdeck — connexion au Net directement dans l\'interface neurale. +Furtivité, impossible à confisquer.',
        optionHint:  '+vitesse élevée · +crypté · +large capacité · +furtif (choisis 2)',
    },
];

export const ITEMS_ALL = [
    // ── Armes à feu ──────────────────────────────────────────────────────────
    {
        name:     'Pistolet de poche',
        category: 'arme_feu',
        tags: [
            { text: '2-dégâts',        variant: 'neutral'  },
            { text: '+contact/courte', variant: 'neutral'  },
            { text: '+discret',        variant: 'positive' },
            { text: '+rapide',         variant: 'positive' },
            { text: '+recharge',       variant: 'negative' },
            { text: '+bruyant',        variant: 'negative' },
        ],
    },
    {
        name:     'Pistolet à fléchettes',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',        variant: 'neutral'  },
            { text: '+courte/proche',  variant: 'neutral'  },
            { text: '+rapide',         variant: 'positive' },
            { text: '+fléchettes',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Revolver léger',
        category: 'arme_feu',
        tags: [
            { text: '2-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+rapide',        variant: 'positive' },
            { text: '+recharge',      variant: 'negative' },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Pistolet semi-automatique',
        category: 'arme_feu',
        tags: [
            { text: '2-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+rapide',        variant: 'positive' },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Revolver lourd',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+recharge',      variant: 'negative' },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Pistolet lourd',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Fusil à pompe',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+carnage',       variant: 'neutral'  },
            { text: '+recharge',      variant: 'negative' },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Fusil de combat',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+carnage',       variant: 'neutral'  },
            { text: '+automatique',   variant: 'neutral'  },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Fusil d\'assaut',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',        variant: 'neutral'  },
            { text: '+proche/longue',  variant: 'neutral'  },
            { text: '+automatique',    variant: 'neutral'  },
            { text: '+bruyant',        variant: 'negative' },
        ],
    },
    {
        name:     'Pistolet-mitrailleur',
        category: 'arme_feu',
        tags: [
            { text: '2-dégâts',       variant: 'neutral'  },
            { text: '+courte/proche', variant: 'neutral'  },
            { text: '+automatique',   variant: 'neutral'  },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Mitrailleuse légère',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',        variant: 'neutral'  },
            { text: '+proche/longue',  variant: 'neutral'  },
            { text: '+carnage',        variant: 'neutral'  },
            { text: '+automatique',    variant: 'neutral'  },
            { text: '+encombrant',     variant: 'negative' },
            { text: '+bruyant',        variant: 'negative' },
        ],
    },
    {
        name:     'Fusil de précision',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',        variant: 'neutral'  },
            { text: '+longue/extrême', variant: 'neutral'  },
            { text: '+encombrant',     variant: 'negative' },
            { text: '+bruyant',        variant: 'negative' },
        ],
    },
    {
        name:     'Fusil antichar',
        category: 'arme_feu',
        tags: [
            { text: '3-dégâts',        variant: 'neutral'  },
            { text: '+longue/extrême', variant: 'neutral'  },
            { text: '+carnage',        variant: 'neutral'  },
            { text: '+antiblindage',   variant: 'neutral'  },
            { text: '+encombrant',     variant: 'negative' },
            { text: '+bruyant',        variant: 'negative' },
        ],
    },
    {
        name:     'Lance-roquette',
        category: 'arme_feu',
        tags: [
            { text: '4-dégâts',       variant: 'neutral'  },
            { text: '+proche/longue', variant: 'neutral'  },
            { text: '+zone',          variant: 'neutral'  },
            { text: '+carnage',       variant: 'neutral'  },
            { text: '+encombrant',    variant: 'negative' },
            { text: '+bruyant',       variant: 'negative' },
        ],
    },
    {
        name:     'Lance-roquette usage unique',
        category: 'arme_feu',
        tags: [
            { text: '4-dégâts',    variant: 'neutral'  },
            { text: '+proche',     variant: 'neutral'  },
            { text: '+zone',       variant: 'neutral'  },
            { text: '+carnage',    variant: 'neutral'  },
            { text: '+recharge',   variant: 'negative' },
            { text: '+bruyant',    variant: 'negative' },
        ],
    },

    // ── Grenades ─────────────────────────────────────────────────────────────
    {
        name:     'Grenades à fragmentation',
        category: 'grenade',
        tags: [
            { text: '4-dégâts',  variant: 'neutral'  },
            { text: '+proche',   variant: 'neutral'  },
            { text: '+zone',     variant: 'neutral'  },
            { text: '+carnage',  variant: 'neutral'  },
            { text: '+recharge', variant: 'negative' },
            { text: '+bruyant',  variant: 'negative' },
        ],
    },
    {
        name:     'Grenades incapacitantes',
        category: 'grenade',
        tags: [
            { text: '+assommant', variant: 'neutral'  },
            { text: '+proche',    variant: 'neutral'  },
            { text: '+zone',      variant: 'neutral'  },
            { text: '+recharge',  variant: 'negative' },
            { text: '+bruyant',   variant: 'negative' },
        ],
    },
    {
        name:     'Grenades à gaz',
        category: 'grenade',
        tags: [
            { text: '+assommant', variant: 'neutral'  },
            { text: '+proche',    variant: 'neutral'  },
            { text: '+zone',      variant: 'neutral'  },
            { text: '+gaz',       variant: 'neutral'  },
            { text: '+recharge',  variant: 'negative' },
        ],
    },

    // ── Armes blanches ───────────────────────────────────────────────────────
    {
        name:     'Couteau',
        category: 'arme_blanche',
        tags: [
            { text: '2-dégâts', variant: 'neutral' },
            { text: '+contact', variant: 'neutral' },
        ],
    },
    {
        name:     'Matraque',
        category: 'arme_blanche',
        tags: [
            { text: '2-dégâts', variant: 'neutral' },
            { text: '+contact', variant: 'neutral' },
        ],
    },
    {
        name:     'Épée ou machette',
        category: 'arme_blanche',
        tags: [
            { text: '3-dégâts', variant: 'neutral' },
            { text: '+contact', variant: 'neutral' },
            { text: '+carnage', variant: 'neutral' },
        ],
    },
    {
        name:     'Taser',
        category: 'arme_blanche',
        tags: [
            { text: '+assommant', variant: 'neutral'  },
            { text: '+contact',   variant: 'neutral'  },
            { text: '+recharge',  variant: 'negative' },
        ],
    },
    {
        name:     'Fouet à monofilament',
        category: 'arme_blanche',
        tags: [
            { text: '4-dégâts',   variant: 'neutral'  },
            { text: '+contact',   variant: 'neutral'  },
            { text: '+carnage',   variant: 'neutral'  },
            { text: '+zone',      variant: 'neutral'  },
            { text: '+dangereux', variant: 'negative' },
        ],
    },
    {
        name:     'Shurikens ou lames de jet',
        category: 'arme_blanche',
        tags: [
            { text: '2-dégâts', variant: 'neutral'  },
            { text: '+courte',  variant: 'neutral'  },
            { text: '+nombreux', variant: 'positive' },
        ],
    },

    // ── Protection ───────────────────────────────────────────────────────────
    {
        name:     'Vêtements renforcés',
        category: 'protection',
        tags: [
            { text: '0-armure',  variant: 'neutral'  },
            { text: '+discret',  variant: 'positive' },
        ],
    },
    {
        name:     'Veste de protection',
        category: 'protection',
        tags: [
            { text: '1-armure', variant: 'neutral' },
        ],
    },
    {
        name:     'Gilet pare-balles',
        category: 'protection',
        tags: [
            { text: '2-armure', variant: 'neutral' },
        ],
    },
    {
        name:     'Armure militaire',
        category: 'protection',
        tags: [
            { text: '3-armure',    variant: 'neutral'  },
            { text: '+encombrant', variant: 'negative' },
        ],
    },

    // ── Équipement ───────────────────────────────────────────────────────────
    {
        name:     'Kit d\'escalade',
        category: 'equipement',
        tags: [],
    },
    {
        name:     'Communicateur',
        category: 'equipement',
        tags: [],
    },
    {
        name:     'Kit de déguisement',
        category: 'equipement',
        tags: [
            { text: '+1 continu identité', variant: 'positive' },
        ],
    },
    {
        name:     'Kit médical d\'urgence',
        category: 'equipement',
        tags: [
            { text: '+premiers soins', variant: 'positive' },
        ],
    },
    {
        name:     'Explosifs',
        category: 'equipement',
        tags: [
            { text: '+perforant',    variant: 'neutral'  },
            { text: '+carnage',      variant: 'neutral'  },
            { text: '+antiblindage', variant: 'neutral'  },
            { text: '+dangereux',    variant: 'negative' },
            { text: '+bruyant',      variant: 'negative' },
        ],
    },
    {
        name:     'Exosquelette gyroscopique',
        category: 'equipement',
        tags: [
            { text: '+stabilisation arme lourde', variant: 'positive' },
        ],
    },
    {
        name:     'Station de réparation microélectronique',
        category: 'equipement',
        tags: [
            { text: '+réparation terrain', variant: 'positive' },
        ],
    },
    {
        name:     'Matériel d\'enregistrement',
        category: 'equipement',
        tags: [
            { text: '+enregistrement', variant: 'neutral' },
            { text: '+audio',          variant: 'neutral' },
            { text: '+vidéo',          variant: 'neutral' },
        ],
    },
    {
        name:     'Combinaison de plongée',
        category: 'equipement',
        tags: [],
    },
    {
        name:     'Silencieux',
        category: 'equipement',
        tags: [
            { text: 'retire +bruyant', variant: 'positive' },
        ],
    },
    {
        name:     'Combinaison furtive',
        category: 'equipement',
        tags: [
            { text: '+1 continu discrétion', variant: 'positive' },
        ],
    },
    {
        name:     'Salle de chirurgie portable',
        category: 'equipement',
        tags: [
            { text: '+blessures mortelles', variant: 'positive' },
            { text: '+implantation cyberware', variant: 'positive' },
        ],
    },
    {
        name:     'Trousse spécialisée',
        category: 'equipement',
        tags: [
            { text: '3 utilisations',   variant: 'neutral'  },
            { text: '+1 jet spécialité', variant: 'positive' },
        ],
    },
    {
        name:     'Traumapatch',
        category: 'equipement',
        tags: [
            { text: '+premiers soins urgence', variant: 'positive' },
        ],
    },
    {
        name:     'Dispositif d\'augmentation visuelle',
        category: 'equipement',
        tags: [],
    },
    {
        name:     'Combinaison ailée',
        category: 'equipement',
        tags: [],
    },
    // ── Véhicules ─────────────────────────────────────────────────────────────
    {
        name:     'Moto',
        category: 'vehicule',
        tags: [
            { text: '+rapide',      variant: 'positive' },
            { text: '+nerveux',     variant: 'positive' },
            { text: '+exigu',       variant: 'negative' },
            { text: '0-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Voiture',
        category: 'vehicule',
        tags: [
            { text: '+fiable',      variant: 'positive' },
            { text: '+spacieux',    variant: 'positive' },
            { text: '1-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Voiture de course',
        category: 'vehicule',
        tags: [
            { text: '+rapide',      variant: 'positive' },
            { text: '+performant',  variant: 'positive' },
            { text: '+fragile',     variant: 'negative' },
            { text: '0-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Voiture blindée',
        category: 'vehicule',
        tags: [
            { text: '+robuste',     variant: 'positive' },
            { text: '+blindé',      variant: 'positive' },
            { text: '+lent',        variant: 'negative' },
            { text: '2-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Van utilitaire',
        category: 'vehicule',
        tags: [
            { text: '+spacieux',    variant: 'positive' },
            { text: '+fiable',      variant: 'positive' },
            { text: '+quelconque',  variant: 'neutral'  },
            { text: '1-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Camion lourd',
        category: 'vehicule',
        tags: [
            { text: '+immense',     variant: 'neutral'  },
            { text: '+robuste',     variant: 'positive' },
            { text: '+lent',        variant: 'negative' },
            { text: '+gourmand',    variant: 'negative' },
            { text: '2-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'AV (Aérovéhicule)',
        category: 'vehicule',
        tags: [
            { text: '+rapide',   variant: 'positive' },
            { text: '+voyant',   variant: 'negative' },
            { text: '+corpo',    variant: 'negative' },
            { text: '1-armure',  variant: 'neutral'  },
        ],
    },
    {
        name:     'Aéroglisseur',
        category: 'vehicule',
        tags: [
            { text: '+rapide',      variant: 'positive' },
            { text: '+tout-terrain',variant: 'positive' },
            { text: '+bruyant',     variant: 'negative' },
            { text: '0-armure',     variant: 'neutral'  },
        ],
    },
    {
        name:     'Bateau rapide',
        category: 'vehicule',
        tags: [
            { text: '+rapide',      variant: 'positive' },
            { text: '+nerveux',     variant: 'positive' },
            { text: '+capricieux',  variant: 'negative' },
            { text: '0-armure',     variant: 'neutral'  },
        ],
    },

    // ── Drones ────────────────────────────────────────────────────────────────
    {
        name:     'Drone de surveillance',
        category: 'drone',
        tags: [
            { text: '+menu',        variant: 'neutral'  },
            { text: '+rotor',       variant: 'neutral'  },
            { text: '+furtif',      variant: 'positive' },
            { text: '+zoom',        variant: 'positive' },
            { text: '+fragile',     variant: 'negative' },
        ],
    },
    {
        name:     'Drone de combat léger',
        category: 'drone',
        tags: [
            { text: '+standard',    variant: 'neutral'  },
            { text: '+rotor',       variant: 'neutral'  },
            { text: '+armé',        variant: 'positive' },
            { text: '+2-dégâts',    variant: 'neutral'  },
            { text: '+bruyant',     variant: 'negative' },
            { text: '+voyant',      variant: 'negative' },
        ],
    },
    {
        name:     'Drone de reconnaissance',
        category: 'drone',
        tags: [
            { text: '+minuscule',   variant: 'neutral'  },
            { text: '+rotor',       variant: 'neutral'  },
            { text: '+furtif',      variant: 'positive' },
            { text: '+thermographique', variant: 'positive' },
            { text: '+fragile',     variant: 'negative' },
        ],
    },
    {
        name:     'Drone terrestre',
        category: 'drone',
        tags: [
            { text: '+standard',    variant: 'neutral'  },
            { text: '+chenilles',   variant: 'neutral'  },
            { text: '+robuste',     variant: 'positive' },
            { text: '+tout-terrain',variant: 'positive' },
            { text: '+lent',        variant: 'negative' },
        ],
    },
    {
        name:     'Drone sous-marin',
        category: 'drone',
        tags: [
            { text: '+standard',    variant: 'neutral'  },
            { text: '+aquatique',   variant: 'neutral'  },
            { text: '+furtif',      variant: 'positive' },
            { text: '+sonar',       variant: 'positive' },
            { text: '+peu fiable',  variant: 'negative' },
        ],
    },
    {
        name:     'Drone lourd armé',
        category: 'drone',
        tags: [
            { text: '+grand',       variant: 'neutral'  },
            { text: '+rotor',       variant: 'neutral'  },
            { text: '+armé',        variant: 'positive' },
            { text: '+3-dégâts',    variant: 'neutral'  },
            { text: '+voyant',      variant: 'negative' },
            { text: '+bruyant',     variant: 'negative' },
        ],
    },
];

/**
 * Interprète le total 2d10 + modificateur selon les seuils The Sprawl.
 * @param {number} total
 * @returns {'success' | 'partial' | 'failure'}
 */
function getOutcome(total) {
    if (total >= SEUIL_SUCCES)  return 'success';
    if (total >= SEUIL_PARTIEL) return 'partial';
    return 'failure';
}

// ── Bloc dice — contrat diceEngine v2 ────────────────────────────────────────

const dice = {

    /**
     * Construit la notation rpg-dice-roller.
     * Appelé par le composant (MoveModal ou clic sur stat) AVANT roll().
     *
     * ctx.systemData doit contenir :
     *   - modifier  {number}  : valeur de stat + lien + saisie manuelle
     *   - useSynth  {boolean} : substitution Synth active
     *
     * @param {object} ctx
     * @returns {string} notation rpg-dice-roller
     */
    buildNotation(ctx) {
        const mod = ctx.systemData?.modifier ?? 0;
        if (mod === 0) return '2d10';
        if (mod > 0)   return `2d10+${mod}`;
        return `2d10${mod}`; // mod négatif → "2d10-2" par ex.
    },

    /**
     * Validation et enrichissement avant le roll.
     * Ici : rien à valider, on passe le ctx tel quel.
     */
    beforeRoll(ctx) {
        return ctx;
    },

    /**
     * Interprétation du raw après le roll.
     * raw.groups[0].values = [dé1, dé2]
     * raw.groups[0].total  = total lib (dés + modificateurs arithmétiques)
     *
     * @param {object} raw
     * @param {object} ctx
     * @returns {object} result
     */
    afterRoll(raw, ctx) {
        const group    = raw.groups[0];
        const diceVals = group.values;          // [dé1, dé2] — faces brutes
        const total    = group.total;           // total avec modificateur
        const modifier = ctx.systemData?.modifier ?? 0;
        const outcome  = getOutcome(total);
        const stat     = ctx.systemData?.stat   ?? null;
        const useSynth = ctx.systemData?.useSynth ?? false;

        return {
            // Données brutes
            diceVals,
            modifier,
            total,
            // Interprétation
            outcome,
            outcomeLabel: OUTCOME_LABEL[outcome],
            // Contexte du jet
            stat:        useSynth ? 'synth' : stat,
            moveName:    ctx.systemData?.moveName ?? null,
            // Transmis à persist
            flags:       raw.flags,
        };
    },

    /**
     * Construit la séquence d'animation pour diceAnimBridge.
     * 2 dés d10, couleur selon la stat.
     *
     * @param {object} raw
     * @param {object} ctx
     * @param {object} result
     * @returns {object} AnimationSequence
     */
    buildAnimationSequence(raw, ctx, result) {
        const stat   = result.stat ?? 'null';
        const color  = STAT_COLOR[stat] ?? 'default';
        const label  = result.moveName
            ? `${result.moveName}${stat ? ` (${STAT_LABEL[stat] ?? stat})` : ''}`
            : (STAT_LABEL[stat] ?? 'Jet libre');

        return {
            mode: 'single',
            groups: [{
                id:       'main',
                diceType: 'd10',
                color,
                label,
                waves: [{ dice: raw.groups[0].values }],
            }],
        };
    },

    /**
     * Rendu custom d'une entrée dans l'historique.
     * Affiche : move/stat + total + outcome pill + dés.
     *
     * @param {object} entry - entrée dice_history désérialisée
     * @returns {JSX.Element | null}
     */
    renderHistoryEntry: (entry) => <DiceEntryHistory roll={entry} />,
};

// ── Données statiques Playbooks ───────────────────────────────────────────────

export const PLAYBOOKS = [
    {
        id:          'Fixer',
        label:       'Fixer',
        description: 'Réseau, contacts, négociation, opérations en coulisses.',
        statHint:    'Privilégie Pro et Style.',
        cyberware:   ['Neuralink comm', 'Interface neurale + stockage', 'Yeux cybernétiques'],
        extraPicksOnMove: 'Chromé', // move qui donne +1 pick cyberware
        defaultPicks: 1,
    },
    {
        id:          'Netrunner',
        label:       'Netrunner',
        description: 'Intrusion dans le Net, cyberespace, guerre de l\'information.',
        statHint:    'Privilégie Synth et Esprit.',
        cyberware:   ['Cyberdeck intégré', 'Interface neurale + stockage', 'Neuralink comm', 'Yeux cybernétiques'],
        defaultPicks: 1,
        netrunnerNote: 'Cyberdeck externe = pas de slot cyberware utilisé.',
    },
    {
        id:          'Solo',
        label:       'Solo',
        description: 'Opérations terrain, infiltration, combat discret.',
        statHint:    'Privilégie Cran et Chair.',
        cyberware:   ['Skilljam', 'Interface neurale + stockage', 'Réflexes câblés', 'Oreilles cybernétiques', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Investigator',
        label:       'Investigator',
        description: 'Investigation, traque, surveillance, renseignement.',
        statHint:    'Privilégie Pro et Esprit.',
        cyberware:   ['Skilljam', 'Oreilles cybernétiques', 'Processeur tactique', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Nomad',
        label:       'Nomad',
        description: 'Conduite, véhicules, filatures, exfiltrations mobiles.',
        statHint:    'Privilégie Pro et Synth.',
        cyberware:   ['Interface neurale + module de contrôle à distance'],
        defaultPicks: 1,
        mandatoryCyberware: 'Interface neurale + module de contrôle à distance',
    },
    {
        id:          'Rockerboy',
        label:       'Rockerboy',
        description: 'Influence, charisme, idéologie, manipulation sociale.',
        statHint:    'Privilégie Style et Pro.',
        cyberware:   ['Armement incorporé', 'Neuralink comm', 'Interface neurale + stockage', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Media',
        label:       'Media',
        description: 'Information, investigation, exposition médiatique.',
        statHint:    'Privilégie Esprit et Style.',
        cyberware:   ['Braindance Recorder', 'Neuralink comm', 'Interface neurale + stockage', 'Oreilles cybernétiques', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Edgerunner',
        label:       'Edgerunner',
        description: 'Mercenaire augmenté, freelance, combat, tactique.',
        statHint:    'Privilégie Cran et Esprit.',
        cyberware:   ['Skilljam', 'Neuralink comm', 'Interface neurale + logiciel de visée', 'Processeur tactique', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Techie',
        label:       'Techie',
        description: 'Matériel, cyberware, équipement, ingénierie.',
        statHint:    'Privilégie Esprit et Synth.',
        cyberware:   ['Bras cybernétique', 'Neuralink comm', 'Interface neurale (stockage ou module)', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Assassin',
        label:       'Assassin',
        description: 'Neutralisation ciblée, élimination, fantôme.',
        statHint:    'Privilégie Cran et Style.',
        cyberware:   [
            'Armement incorporé', 'Sous-derme', 'Bras cybernétique',
            'Greffe musculaire', 'Interface neurale + logiciel de visée',
            'Réflexes câblés', 'Sandevistan', 'Slice \'N Dice', 'Yeux cybernétiques',
        ],
        defaultPicks: 2, // l'Assassin démarre avec 2 implants
    },
];

export const TAG_SUGGESTIONS_BY_TYPE = {
    character: [
        { text: '+blessé',       variant: 'negative' },
        { text: '+sonné',        variant: 'negative' },
        { text: '+grillé',       variant: 'negative' },
        { text: '+repéré',       variant: 'negative' },
        { text: '+endetté',      variant: 'negative' },
        { text: '+épuisé',       variant: 'negative' },
        { text: '+traumatisé',   variant: 'negative' },
        { text: '+en fuite',     variant: 'negative' },
    ],
    cyberware: [
        { text: '+défaillant',   variant: 'negative' },
        { text: '+dégradation',  variant: 'negative' },
        { text: '+douloureux',   variant: 'negative' },
        { text: '+aliénant',     variant: 'negative' },
        { text: '+médiocre',     variant: 'negative' },
        { text: '+crypté',       variant: 'positive' },
        { text: '+furtif',       variant: 'positive' },
        { text: '+modifié',      variant: 'neutral'  },
    ],
    relation: [
        { text: '+dette',        variant: 'negative' },
        { text: '+compromis',    variant: 'negative' },
        { text: '+menacé',       variant: 'negative' },
        { text: '+disparu',      variant: 'negative' },
        { text: '+fiable',       variant: 'positive' },
        { text: '+allié',        variant: 'positive' },
        { text: '+redevable',    variant: 'positive' },
        { text: '+suspect',      variant: 'neutral'  },
    ],
    item: [
        { text: '+défaillant',   variant: 'negative' },
        { text: '+dégradé',      variant: 'negative' },
        { text: '+volé',         variant: 'negative' },
        { text: '+tracé',        variant: 'negative' },
        { text: '+modifié',      variant: 'neutral'  },
        { text: '+rare',         variant: 'positive' },
        { text: '+militaire',    variant: 'neutral'  },
        { text: '+illégal',      variant: 'negative' },
    ],
};

// Profils de répartition des stats à la création
export const STAT_PROFILES = [
    {
        id:          'A',
        label:       'Profil A — Un seul point faible, moins de force',
        description: '+2 / +1 / 0 / 0 / 0 / -2',
        values:      [2, 1, 0, 0, 0, -2],
    },
    {
        id:          'B',
        label:       'Profil B — Deux points faibles, plus de force globale',
        description: '+2 / +1 / +1 / 0 / -1 / -2',
        values:      [2, 1, 1, 0, -1, -2],
    },
];

export const STATS = ['cran', 'pro', 'chair', 'esprit', 'style', 'synth'];
export const STAT_LABELS = STAT_LABEL;

// Directives personnelles disponibles
export const DIRECTIVES_PERSONNELLES = [
    { id: 'ambitieux',    label: 'Ambitieux',    hasBlank: true,  blankHint: 'Au sein de ___' },
    { id: 'celebre',      label: 'Célèbre',       hasBlank: false },
    { id: 'compatissant', label: 'Compatissant',  hasBlank: false },
    { id: 'filial',       label: 'Filial',        hasBlank: true,  blankHint: 'Conseils de ___' },
    { id: 'fureteur',     label: 'Fureteur',      hasBlank: true,  blankHint: 'À propos de ___' },
    { id: 'intime',       label: 'Intime',        hasBlank: true,  blankHint: 'Mon ami ___' },
    { id: 'masochiste',   label: 'Masochiste',    hasBlank: false },
    { id: 'motive',       label: 'Motivé',        hasBlank: true,  blankHint: 'Mon code de conduite : ___' },
    { id: 'partisan',     label: 'Partisan',      hasBlank: true,  blankHint: 'Appartenance à ___' },
    { id: 'proselyte',    label: 'Prosélyte',     hasBlank: false },
    { id: 'protecteur',   label: 'Protecteur',    hasBlank: true,  blankHint: 'Responsabilités envers ___' },
    { id: 'prudent',      label: 'Prudent',       hasBlank: false },
    { id: 'rejete',       label: 'Rejeté',        hasBlank: true,  blankHint: 'Ancienne appartenance à ___' },
    { id: 'trompeur',     label: 'Trompeur',      hasBlank: false },
    { id: 'venal',        label: 'Vénal',         hasBlank: false },
    { id: 'vengeur',      label: 'Vengeur',       hasBlank: true,  blankHint: 'Nuire à ___' },
    { id: 'violent',      label: 'Violent',       hasBlank: false },
];

// ── Export config principal ───────────────────────────────────────────────────

const cyberpunkConfig = {
    slug:  'cyberpunk',
    label: 'Cyberpunk',
    dice,
    diceDefaults: {
        mode:   'custom',
        custom: {
            foreground: '#00e5ff',
            background: '#050508',
            outline:    '#ff2d78',
            edge:       '#001a20',
            texture:    '',
            material:   'metal',
        },
        lightColor:       '#00e5ff',
        strength:         6,
        gravity:          400,
        sounds:           false,
        animationEnabled: true,
    },
};

export default cyberpunkConfig;