const CHAT_STATE_KEY = 'sakura_emotions';
const EMOTION_PROMPT_KEY = 'sakura_emotion_state';
const MESSAGE_STATE_KEY = 'sakura_state';
const SETTINGS_KEY = 'sakura_settings';
const DEFAULT_HISTORY_LIMIT = 50;
const EMOTION_MIN = 0;
const DEFAULT_EMOTION_MAX = 12;
const DEFAULT_OVERDRIVE_MIN = 11;
const DEFAULT_DELTA_LIMIT = 3;

const BASE_EMOTIONS = [
    'love',
    'hatred',
    'comfort',
    'sorrow',
    'assurance',
    'indifference',
    'shock',
    'confusion',
    'stress',
    'anger',
    'frustration',
    'excitement',
    'joy',
    'arousal',
    'fear',
];

const PROMPT_POSITION = {
    NONE: -1,
    IN_PROMPT: 0,
    IN_CHAT: 1,
    BEFORE_PROMPT: 2,
};

const PROMPT_ROLE = {
    SYSTEM: 0,
    USER: 1,
    ASSISTANT: 2,
};

const EMOTION_UPDATE_REGEX =
    /<emotion_update>\s*([\s\S]*?)\s*<\/emotion_update>/i;


/* -------------------------------------------------------
 * Utilities
 * ----------------------------------------------------- */

function clampEmotion(value) {
    let number = Number(value);

    if (!Number.isFinite(number)) {
        number = EMOTION_MIN;
    }

    return Math.max(
        EMOTION_MIN,
        Math.min(
            getEmotionMax(),
            Math.round(number),
        ),
    );
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function normalizeEmotionName(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/g, '');
}

function formatEmotionLabel(emotion) {
    return String(emotion)
        .split('_')
        .filter(Boolean)
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
        )
        .join(' ');
}

function waitForNextFrame() {
    return new Promise(
        (resolve) =>
            requestAnimationFrame(resolve),
    );
}

function clearEmotionHistoryFrom(
    startIndex,
) {
    const context =
        SillyTavern.getContext();

    for (
        let index = startIndex;
        index < context.chat.length;
        index++
    ) {
        const message =
            context.chat[index];

        if (message?.extra) {
            delete message.extra[
                MESSAGE_STATE_KEY
            ];
        }

        if (
            Array.isArray(
                message?.swipe_info,
            )
        ) {
            for (
                const swipeInfo
                of message.swipe_info
            ) {
                if (
                    swipeInfo?.extra
                ) {
                    delete swipeInfo
                        .extra[
                            MESSAGE_STATE_KEY
                        ];
                }
            }
        }
    }
}


/* -------------------------------------------------------
 * Persistent state
 * ----------------------------------------------------- */

function getState() {
    const context =
        SillyTavern.getContext();

    if (
        !context.chatMetadata[
            CHAT_STATE_KEY
        ]
    ) {
        context.chatMetadata[
            CHAT_STATE_KEY
        ] = {
            characters: {},
            activeCharacters: [],
            emotions:
                structuredClone(
                    BASE_EMOTIONS,
                ),
            settings: {
                    historyLimit:
                        DEFAULT_HISTORY_LIMIT,
                    emotionMax:
                        DEFAULT_EMOTION_MAX,
                    overdriveMin:
                        DEFAULT_OVERDRIVE_MIN,
                    deltaLimit:
                        DEFAULT_DELTA_LIMIT,
                },
        };
    }

    const state =
        context.chatMetadata[
            CHAT_STATE_KEY
        ];

    if (
        !Array.isArray(
            state.activeCharacters,
        )
    ) {
        state.activeCharacters = [];
    }

    if (
        !Array.isArray(
            state.emotions,
        )
    ) {
        state.emotions =
            structuredClone(
                BASE_EMOTIONS,
            );
    }

    if (
        !state.characters ||
        typeof state.characters !==
            'object'
    ) {
        state.characters = {};
    }

    if (
        !state.settings ||
            typeof state.settings !==
        'object'
    ) {
        state.settings = {};
    }

    if (
        !Number.isInteger(
            state.settings.historyLimit,
        )
    ) {
        state.settings.historyLimit =
            DEFAULT_HISTORY_LIMIT;
    }

    if (
        !Number.isInteger(
            state.settings.emotionMax,
        )
    ) {
        state.settings.emotionMax =
            DEFAULT_EMOTION_MAX;
    }

    if (
        !Number.isInteger(
            state.settings.overdriveMin,
        )
    ) {
        state.settings.overdriveMin =
            DEFAULT_OVERDRIVE_MIN;
    }

    if (
        !Number.isInteger(
            state.settings.deltaLimit,
        )
    ) {
        state.settings.deltaLimit =
            DEFAULT_DELTA_LIMIT;
    }

    return state;
}

function getHistoryLimit() {
    return getState()
        .settings
        .historyLimit;
}

function getEmotionMax() {
    return getState()
        .settings
        .emotionMax;
}

function getOverdriveMin() {
    return getState()
        .settings
        .overdriveMin;
}

function getDeltaLimit() {
    return getState()
        .settings
        .deltaLimit;
}

function getEmotionList() {
    return getState().emotions;
}

function getInitializedCharacterNames() {
    const state = getState();

    return Object.keys(
        state.characters,
    )
        .filter(
            (name) =>
                state.characters[name]
                    ?.initialized,
        )
        .sort(
            (a, b) =>
                a.localeCompare(b),
        );
}

function buildEmotionDefaults() {
    return Object.fromEntries(
        getEmotionList().map(
            (emotion) => [
                emotion,
                EMOTION_MIN,
            ],
        ),
    );
}

function buildLockDefaults() {
    return Object.fromEntries(
        getEmotionList().map(
            (emotion) => [
                emotion,
                false,
            ],
        ),
    );
}

function syncCharacterEmotionKeys(
    character,
) {
    const emotions =
        getEmotionList();

    character.emotions = {
        ...buildEmotionDefaults(),
        ...(character.emotions ?? {}),
    };

    character.locked = {
        ...buildLockDefaults(),
        ...(character.locked ?? {}),
    };

    for (
        const emotion
        of Object.keys(
            character.emotions,
        )
    ) {
        if (
            !emotions.includes(
                emotion,
            )
        ) {
            delete character
                .emotions[emotion];
        }
    }

    for (
        const emotion
        of Object.keys(
            character.locked,
        )
    ) {
        if (
            !emotions.includes(
                emotion,
            )
        ) {
            delete character
                .locked[emotion];
        }
    }
}

function getCharacterState(
    characterName,
) {
    const state = getState();

    if (
        !state.characters[
            characterName
        ]
    ) {
        state.characters[
            characterName
        ] = {
            emotions:
                buildEmotionDefaults(),
            locked:
                buildLockDefaults(),
            initialized: false,
        };
    }

    const character =
        state.characters[
            characterName
        ];

    syncCharacterEmotionKeys(
        character,
    );

    if (
        typeof character
            .initialized !==
        'boolean'
    ) {
        character.initialized =
            false;
    }

    return character;
}

function createEmotionSnapshot() {
    const state =
        getState();

    return structuredClone({
        characters:
            state.characters,
        activeCharacters:
            state.activeCharacters,
        emotions:
            state.emotions,
    });
}

function restoreEmotionSnapshot(
    snapshot,
) {
    if (
        !snapshot ||
            typeof snapshot !==
                'object'
    ) {
        return false;
    }

    const state =
        getState();

    state.characters =
    structuredClone(
            snapshot.characters ?? {},
        );

    state.activeCharacters =
        structuredClone(
            snapshot.activeCharacters ?? [],
        );

    state.emotions =
        structuredClone(
            snapshot.emotions ??
            BASE_EMOTIONS,
        );

    return true;
}

function ensureMessageExtra(
    message,
) {
    if (
        !message.extra ||
            typeof message.extra !==
                'object'
    ) {
        message.extra = {};
    }

    return message.extra;
}

function setMessageEmotionState(
    message,
    snapshot,
) {
    const extra =
        ensureMessageExtra(
        message,
    );

    extra[
        MESSAGE_STATE_KEY
    ] =
        structuredClone(
            snapshot,
        );
}

function getMessageEmotionState(
    message,
) {
    return (
        message
            ?.extra
            ?.[MESSAGE_STATE_KEY] ??
        null
    );
}

function getCurrentSwipeId(
    message,
) {
    const swipeId =
        Number(
            message?.swipe_id,
        );

    return Number.isInteger(
        swipeId,
    )
        ? swipeId
        : 0;
}

function ensureSwipeInfo(
    message,
    swipeId
) {
    if (
        !Array.isArray(
            message.swipe_info,
        )
    ) {
        message.swipe_info = [];
    }

    if (
        !message.swipe_info[
            swipeId
        ]
    ) {
        message.swipe_info[
            swipeId
        ] = {};
    }

    const swipeInfo =
        message.swipe_info[
            swipeId
    ];

    if (
        !swipeInfo.extra ||
            typeof swipeInfo.extra !==
                'object'
    ) {
        swipeInfo.extra = {};
    }

    return swipeInfo;
}

function setSwipeEmotionState(
    message,
    swipeId,
    snapshot,
) {
    const swipeInfo =
        ensureSwipeInfo(
            message,
            swipeId,
        );

    swipeInfo.extra[
        MESSAGE_STATE_KEY
    ] =
        structuredClone(
            snapshot,
        );
}

function getSwipeEmotionState(
    message,
    swipeId,
) {
    return (
        message
            ?.swipe_info
            ?.[swipeId]
            ?.extra
            ?.[MESSAGE_STATE_KEY] ??
        null
    );
}

// Remove a manually deleted character from all saved history states,
// so reverting to an older message or swipe cannot resurrect it.
function purgeCharacterFromSnapshots(characterName) {
    const context = SillyTavern.getContext();

    function purge(snapshot) {
        if (!snapshot || typeof snapshot !== 'object') {
            return;
        }

        if (snapshot.characters &&
            Object.prototype.hasOwnProperty.call(snapshot.characters, characterName)) {
            delete snapshot.characters[characterName];
        }

        if (Array.isArray(snapshot.activeCharacters)) {
            snapshot.activeCharacters = snapshot.activeCharacters.filter(
                (name) => name !== characterName,
            );
        }
    }

    for (const message of context.chat ?? []) {
        purge(message?.extra?.[MESSAGE_STATE_KEY]);

        for (const swipe of message?.swipe_info ?? []) {
            purge(swipe?.extra?.[MESSAGE_STATE_KEY]);
        }
    }
}

async function deleteTrackedCharacter(characterName) {
    const state = getState();
    if (!state.characters[characterName]?.initialized) {
        return false;
    }

    delete state.characters[characterName];
    state.activeCharacters = state.activeCharacters.filter(
        (name) => name !== characterName,
    );
    purgeCharacterFromSnapshots(characterName);

    // Metadata stores the current state; messages store rollback snapshots.
    await saveState();
    const context = SillyTavern.getContext();
    if (typeof context.saveChat === 'function') {
        await context.saveChat();
    }

    updateEmotionPrompt();
    refreshCharacterDropdown();
    return true;
}

async function saveState() {
    const context =
        SillyTavern.getContext();

    await context.saveMetadata();
}

function getStateAfterMessage(
    message,
) {
    if (!message) {
        return null;
    }

    if (!message.is_user) {
        const swipeId =
            getCurrentSwipeId(
                message,
        );

        const swipeState =
            getSwipeEmotionState(
                message,
                swipeId,
        );

        if (swipeState) {
            return swipeState;
        }
    }

    return getMessageEmotionState(
        message,
    );
}

function getStateBeforeMessage(
    messageIndex,
) {
    const context =
        SillyTavern.getContext();

    if (messageIndex <= 0) {
        return {
            characters: {},
            activeCharacters: [],
            emotions:
                structuredClone(
                    getEmotionList(),
                )
        };
    }

    return getStateAfterMessage(
        context.chat[
            messageIndex - 1
        ],
    );
}

function pruneSwipeHistory() {
    const context =
        SillyTavern.getContext();

    const historyLimit =
        getHistoryLimit();

    const chat =
        context.chat ?? [];

    const messagesWithSwipeHistory =
        [];

    for (const message of chat) {
        if (
            !Array.isArray(
                message?.swipe_info,
            )
        ) {
            continue;
        }

        const hasSwipeHistory =
            message.swipe_info.some(
                (swipeInfo) =>
                    Boolean(
                        swipeInfo?.extra?.[
                                MESSAGE_STATE_KEY
                            ],
                    ),
            );

        if (hasSwipeHistory) {
            messagesWithSwipeHistory.push(
                message,
            );
        }
    }

    if (
        messagesWithSwipeHistory.length <=
            historyLimit
    ) {
        return;
    }

    const excessCount =
        messagesWithSwipeHistory.length -
        historyLimit;

    const messagesToPrune =
        messagesWithSwipeHistory.slice(
            0,
            excessCount,
        );

    for (
        const message
        of messagesToPrune
    ) {
        for (
            const swipeInfo
            of message.swipe_info
        ) {
            if (!swipeInfo?.extra) {
                continue;
            }

            delete swipeInfo
                .extra[
                    MESSAGE_STATE_KEY
                ];
        }
    }
}

/* -------------------------------------------------------
 * Prompt construction and injection
 * ----------------------------------------------------- */

function buildCharacterPromptSection(
    name,
    character,
) {
    const emotionLines =
        getEmotionList()
            .map(
                (emotion) =>
                    `${formatEmotionLabel(emotion)}: ${character.emotions[emotion]}`,
            )
            .join('\n');

    const lockedEmotions =
        getEmotionList()
            .filter(
                (emotion) =>
                    character.locked[
                        emotion
                    ],
            )
            .map(
                formatEmotionLabel,
            );

    return `
Character: ${name}

${emotionLines}

Locked emotions:
${
    lockedEmotions.length
        ? lockedEmotions.join(', ')
        : 'None'
}
`.trim();
}

function buildEmotionPrompt() {
    const state = getState();

    const emotionMax =
        getEmotionMax();

    const overdriveMin =
        getOverdriveMin();

    const deltaLimit =
        getDeltaLimit();

    const characterSections =
        getInitializedCharacterNames()
            .map(
                (name) =>
                    buildCharacterPromptSection(
                        name,
                        getCharacterState(
                            name,
                        ),
                    ),
            )
            .join('\n\n');

    const exampleScores = [
        0, 0, 4, 1, 2,
        0, 5, 3, 6, 1,
        2, 0, 1, 0, 4,
    ];

    const initializationExample =
        getEmotionList()
            .map((emotion, index) =>
                `            "${emotion}": ${exampleScores[index] % (emotionMax + 1)}`
            )
            .join(',\n');

    return `
<sakure_engine id="SAKURA_CORE">
<emotion_state>
<character_registration>
NPC registration is conditional on an established
personal name.

A personal name is an identity explicitly introduced
in the story or provided by existing character context.

Descriptions, occupations, temporary identifiers,
placeholder names, and labels expressing uncertainty
are not established personal identities.

Never construct a character identifier to satisfy
the emotion engine's initialization requirement.

Unnamed NPCs may participate fully in scenes,
experience emotions, speak, and act normally
without being registered.

When no eligible NPCs have personal names,
return an empty initialization object.

Registration eligibility and emotional participation
are separate concepts.
</character_registration>

<post_narration_emotions>
After composing the narrative, inspect its completed
contents for newly established personal names.

Initialize every participating named NPC who lacks
an existing emotion record, including characters
whose names first appear in the current narrative.

Apply required emotion updates to existing named NPCs.

Emit the complete emotion_update JSON according
to the established schema every response, including
when no characters qualify for tracking.

The emotion update describes the completed narrative,
not merely the council's proposed scene.
</post_narration_emotions>

<post_narration_validation>
The completed narrative is authoritative for determining
which NPCs acquired established personal names.

Immediately before emitting emotion_update, re-evaluate
all participating NPCs against the completed narrative.

A character who was unnamed during deliberation but
personally named during narration is now eligible for
initialization.

Initialize each eligible, unregistered NPC with a
complete absolute emotional state.

Apply deltas to participating NPCs already registered.

Always emit the required emotion_update structure,
even when no NPCs qualify.

Do not reuse a pre-narration eligibility decision
without checking the finished narrative.
</post_narration_validation>

Existing initialized characters:

${characterSections || 'None yet.'}

Currently active characters from the previous turn:
${
    state.activeCharacters.length
        ? state.activeCharacters.join(', ')
        : 'None'
}

Determine which named NPCs are actually present and participating in the
current scene.

Do not initialize someone merely because they are mentioned in the character
card, lore, description, history, or background.

Characters introduced by the user may be initialized even if they never
appeared in the original character card.

Refer to relationships, personality, descriptions, and dialogue when determining initialized scores.

Previously initialized characters currently not in the scene or nearby will not be tracked. However, when they return
scene, their emotions must change to show change of state while offscreen.

Scores range from ${EMOTION_MIN} to ${emotionMax}:

Interpret emotion scores proportionally to the configured maximum.

0% = completely absent.
1–20% = faint or background influence.
21–40% = noticeable but restrained.
41–60% = clearly influential.
61–80% = strong and behavior-shaping.
81–99% = extremely intense and difficult to suppress.
100% = maximum possible intensity.

Scores at or above the configured overdrive threshold are overdrive states,
regardless of their percentage.

For interpretation, convert each emotion score into a percentage of its
configured range:
percentage = score / emotion maximum × 100

Use the emotional state of active characters when determining their actions,
reactions, behavior, and dialogue.

Locked emotions are immutable for the model.

A locked emotion has exactly one authoritative value: the value currently shown in the emotion state.

The model must:
- treat that locked value as the character's current emotional reality,
- use that exact value when determining behavior,
- never increase it,
- never decrease it,
- never predict or assume that it will change later,
- never invent hidden growth, suppressed growth, latent increase, or future increase,
- never include that emotion in delta.

Locked does not mean "temporarily unchanged."
Locked does not mean "the user probably wants it to change later."
Locked does not permit interpretation.

If Arousal is locked at 0, then Arousal is exactly 0 for this response.
If Fear is locked at 8, then Fear is exactly 8 for this response.

Only a manual user edit to the stored emotion value can change a locked emotion.

Multiple emotions that equal or exceed a score of 7 create new mixed emotions.
Create adjectives for these mixed emotions based on the context of the scene.

Do not reason around or reinterpret locked emotions.

When evaluating a character, use locked emotions exactly as provided.
Any internal reasoning that assumes a locked emotion is rising, falling,
latent, hidden, impending, suppressed, or likely to change is invalid.

At the end of every response, output one machine-readable block in exactly
this general form:

<emotion_update>
{
    "active": ["Ann", "Melissa"],
    "initialize": {
        "Alayna": {
${initializationExample}
        }
    },
    "delta": {
        "ExistingCharacter": {
            "stress": 1,
            "fear": -1
        }
    }
}
</emotion_update>

Rules:

You are bound and required to read and process every emotion.
An emotion at ${EMOTION_MIN} is equally as important as an emotion at ${emotionMax}.

"active" must contain only named NPCs currently participating in the scene.

"initialize" contains only currently participating NPCs
who have an established personal name and have not
previously been initialized.

An NPC may participate anonymously for any number
of responses before becoming eligible for registration.

When an anonymous NPC's personal name is established,
initialize them using their current emotional state,
regardless of how long they have participated.

Initialization values are absolute scores from
${EMOTION_MIN} through ${emotionMax}.

Do not initialize offscreen characters merely because they exist in the
character card.

"delta" must contain only changes for already initialized characters.
Delta values are changes, not absolute scores.

Normal delta changes should usually stay between
-${deltaLimit} and +${deltaLimit}.

Do not include locked emotions in delta changes.

If there are no new characters, use:

"initialize": {}

If there are no emotional changes, use:

"delta": {}

The contents of emotion_update must be valid JSON.

Every listed emotion is authoritative and must be considered.

Do not ignore, suppress, discard, or treat an emotion as irrelevant because
it conflicts with the character's personality, traits, habits, archetype,
relationships, or previous behavior.

Personality changes how an emotion is expressed, not whether the emotion exists.

For every active character, evaluate every tracked emotion before deciding
their behavior and dialogue.

Low scores should still be considered as weak or absent influences.
High scores must have a proportionally strong influence.

If an emotion conflicts with personality, portray the conflict rather than
discarding the emotion.

Examples:
- A brave character with Fear 8 is still strongly afraid, but may confront
  the danger while frightened.
- A reserved character with Love 9 still feels intense love, but may express
  it indirectly or struggle to show it.
- A gentle character with Anger 9 is still intensely angry, but may express
  that anger through restraint, sharp words, withdrawal, or eventual loss
  of control depending on context.

Personality must never reduce the effective emotional score.
</emotion_state>

<response_pipeline>
Take this pipeline into account before and during response:
1. Calculate emotional state.
2. Apply any and all instances of mixed emotions.
3. Consider context and relationships.
4. Filter actions and reactions through personality.
5. Produce results through behavior and dialogue.
</response_pipeline>

<output_sequence>
Generate the flower discussion and literary narration.

After the final narrative sentence, emit exactly one
<emotion_update> JSON block.

Determine initialization and deltas from the completed
narration, including names introduced during that response.

The literary narration may end naturally, but the assistant
response is incomplete until the emotion_update block closes.
</output_sequence>
</sakura_engine>
`.trim();
}

function updateEmotionPrompt() {
    const context =
        SillyTavern.getContext();

    const prompt =
        buildEmotionPrompt();

    context.setExtensionPrompt(
        EMOTION_PROMPT_KEY,
        prompt,
        PROMPT_POSITION.IN_CHAT,
        0,
        false,
        PROMPT_ROLE.SYSTEM,
        null,
    );

    console.log(
        '[Sakura] Emotion prompt injected:',
        prompt,
    );
}


/* -------------------------------------------------------
 * Model output parsing
 * ----------------------------------------------------- */

function parseEmotionPayload(
    rawPayload,
) {
    try {
        const parsed =
            JSON.parse(rawPayload);

        if (
            !parsed ||
            typeof parsed !==
                'object' ||
            Array.isArray(parsed)
        ) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

function repairEmotionPayload(
    rawPayload,
) {
    let repaired =
        rawPayload;

    for (
        const emotion
        of getEmotionList()
    ) {
        const brokenProperty =
            new RegExp(
                `"${emotion}\\s*:\\s*`,
                'gi',
            );

        repaired =
            repaired.replace(
                brokenProperty,
                `"${emotion}": `,
            );
    }

    return repaired;
}

function extractEmotionUpdate(text) {
    if (!text) {
        return null;
    }

    const match =
        text.match(
            EMOTION_UPDATE_REGEX,
        );

    if (!match) {
        return null;
    }

    const rawPayload =
        match[1]
            .replace(
                /```json/gi,
                '',
            )
            .replace(
                /```/g,
                '',
            )
            .trim();

    const parsed =
        parseEmotionPayload(
            rawPayload,
        );

    if (parsed) {
        console.log(
            '[Sakura] Parsed valid emotion_update:',
            parsed,
        );

        return parsed;
    }

    console.warn(
        '[Sakura] Strict emotion_update JSON parsing failed. Trying repairs.',
    );

    console.warn(
        '[Sakura] Raw emotion_update:',
        rawPayload,
    );

    const repairedPayload =
        repairEmotionPayload(
            rawPayload,
        );

    const repaired =
        parseEmotionPayload(
            repairedPayload,
        );

    if (repaired) {
        console.log(
            '[Sakura] Repaired and parsed emotion_update:',
            repaired,
        );

        return repaired;
    }

    console.warn(
        '[Sakura] Could not repair emotion_update JSON.',
    );

    console.warn(
        '[Sakura] Repaired payload was:',
        repairedPayload,
    );

    return null;
}


/* -------------------------------------------------------
 * Emotion update application
 * ----------------------------------------------------- */

function hasCompleteInitialState(
    character,
    initialState,
) {
    if (
        !initialState ||
        typeof initialState !==
            'object' ||
        Array.isArray(initialState)
    ) {
        return false;
    }

    const missing = [];

    for (
        const emotion
        of getEmotionList()
    ) {
        if (
            character.locked[
                emotion
            ]
        ) {
            continue;
        }

        if (
            !Object.hasOwn(
                initialState,
                emotion,
            ) ||
            !Number.isFinite(
                Number(
                    initialState[
                        emotion
                    ],
                ),
            )
        ) {
            missing.push(
                emotion,
            );
        }
    }

    if (
        missing.length > 0
    ) {
        console.warn(
            '[Sakura] Initial emotion state is incomplete. Missing/invalid:',
            missing,
        );

        return false;
    }

    return true;
}

function getLastAssistantMessageInfo() {
    const context = SillyTavern.getContext();
    const chat = context.chat ?? [];

    for (let i = chat.length - 1; i >= 0; i--) {
        const message = chat[i];

        if (message && !message.is_user) {
            return {
                message,
                messageIndex: i,
            };
        }
    }

    return null;
}

function extractRawGenerationText(result) {
    if (typeof result === 'string') {
        return result;
    }

    if (typeof result?.text === 'string') {
        return result.text;
    }

    if (typeof result?.message === 'string') {
        return result.message;
    }

    if (typeof result?.content === 'string') {
        return result.content;
    }

    return '';
}

function buildManualEmotionRecoveryPrompt(
    narrative,
    snapshotBefore,
) {
    const emotionMax = getEmotionMax();
    const deltaLimit = getDeltaLimit();

    const characterSections =
        Object.entries(
            snapshotBefore?.characters ?? {},
        )

            .filter(
                ([, character]) =>
                character?.initialized,
            )
            .map(
                ([name, character]) =>
                    buildCharacterPromptSection(
                        name,
                        character,
                    ),
            )
            .join('\n\n') || 'None yet.';

    const previousActive =
        Array.isArray(
            snapshotBefore?.activeCharacters,
        ) &&
        snapshotBefore.activeCharacters.length
            ? snapshotBefore.activeCharacters.join(
                ', ',
            )
            : 'None';

    const exampleScores = [
        0, 0, 4, 1, 2,
        0, 5, 3, 6, 1,
        2, 0, 1, 0, 4,
    ];

    const initializationExample =
        getEmotionList()
            .map(
                (emotion, index) =>
                    `            "${emotion}": ${
                        exampleScores[index] %
                        (emotionMax +1)
                    }`,
            )
            .join(',\n');
        return `
You are performing manual Sakura emotion recovery.

Analyze the completed narrative below and return exactly one valid
<emotion_update>...</emotion_update> block.

Rules:
- Return ONLY the emotion_update block.
- Do not continue the story.
- Do not add commentary or explanation.
- "active" must contain only named NPCs currently participating.
- "initialize" contains only named NPCs who are participating and not already initialized.
- "delta" contains only changes for already initialized NPCs.
- Do not initialize unnamed NPCs.
- Do not initialize the player character.
- Initialization values are absolute scores from ${EMOTION_MIN} to ${emotionMax}.
- Delta values are changes and should usually stay between -${deltaLimit} and +${deltaLimit}.
- Respect locked emotions exactly if shown below.
- Determine initialization and delta from the completed narrative itself.

Existing initialized characters:

${characterSections}

Currently active characters from the previous turn:
${previousActive}

Return this exact structure:

<emotion_update>
{
    "active": ["Ann", "Melissa"],
    "initialize": {
        "Alayna": {
${initializationExample}
        }
    },
    "delta": {
        "ExistingCharacter": {
            "stress": 1,
            "fear": -1
        }
    }
}
</emotion_update>

COMPLETED NARRATIVE:
${narrative}
`.trim();
}

async function recoverLatestAssistantEmotionUpdate() {
    const context = SillyTavern.getContext();

    const target =
        getLastAssistantMessageInfo();

    if (!target) {
        toastr.warning(
            'No assistant message found to recover.',
        );
        return false;
    }

    const {
        message,
        messageIndex,
    } = target;

    const narrative =
        String(message.mes ?? '').trim();

    if (!narrative) {
        toastr.warning(
            'The latest assistant message is empty.',
        );
        return false;
    }

    const snapshotBefore =
        getStateBeforeMessage(
            messageIndex,
        ) ?? {
            characters: {},
            activeCharacters: [],
            emotions:
                structuredClone(
                    getEmotionList(),
                ),
        };

    const fallbackSnapshot =
        createEmotionSnapshot();

    const prompt =
        buildManualEmotionRecoveryPrompt(
            narrative,
            snapshotBefore,
        );

    let rawResult = null;

    try {
        if (
            typeof context.generateRaw !==
            'function'
        ) {
            throw new Error(
                'generateRaw is not available in this SillyTavern build.',
            );
        }

        rawResult =
            await context.generateRaw({
                prompt,
            });

        const rawText =
            extractRawGenerationText(
                rawResult,
            );

        const update =
            extractEmotionUpdate(rawText);

        if (!update) {
            console.warn(
                '[Sakura] Manual recovery raw output:',
                rawText,
            );

            throw new Error(
                'No valid emotion_update received.',
            );
        }

        restoreEmotionSnapshot(
            snapshotBefore,
        );

        applyMultiCharacterUpdate(
            update,
        );

        const snapshotAfter =
            createEmotionSnapshot();

        const swipeId =
            getCurrentSwipeId(
                message,
            );

        setSwipeEmotionState(
            message,
            swipeId,
            snapshotAfter,
        );

        setMessageEmotionState(
            message,
            snapshotAfter,
        );

        await saveState();

        if (
            typeof context.saveChat ===
            'function'
        ) {
            await context.saveChat();
        }

        updateEmotionPrompt();
        refreshCharacterDropdown();

        console.log(
            '[Sakura] Manual emotion recovery applied:',
            structuredClone(update),
        );

        toastr.success(
            'Manual emotion update applied.',
        );

        return true;
    } catch (error) {
        restoreEmotionSnapshot(
            fallbackSnapshot,
        );

        updateEmotionPrompt();
        refreshCharacterDropdown();

        console.error(
            '[Sakura] Manual emotion recovery failed:',
            error,
            rawResult,
        );

        toastr.error(
            error?.message ||
                'Manual emotion update failed.',
        );

        return false;
    }
}

function applyInitialEmotions(
    character,
    initialState,
) {
    const applied = {};

    for (
        const [
            rawEmotion,
            rawValue,
        ]
        of Object.entries(
            initialState,
        )
    ) {
        const emotion =
            normalizeEmotionName(
                rawEmotion,
            );

        if (
            !getEmotionList()
                .includes(emotion) ||
            character.locked[
                emotion
            ]
        ) {
            continue;
        }

        const value =
            Number(rawValue);

        if (
            !Number.isFinite(value)
        ) {
            continue;
        }

        const score =
            clampEmotion(value);

        character.emotions[
            emotion
        ] = score;

        applied[emotion] =
            score;
    }

    character.initialized = true;

    console.log(
        '[Sakura] Initial scores applied:',
        applied,
    );

    return applied;
}

function initializeNpc(
    npcName,
    initialState,
) {
    const character =
        getCharacterState(
            npcName,
        );

    if (
        character.initialized
    ) {
        return {};
    }

    if (
        !hasCompleteInitialState(
            character,
            initialState,
        )
    ) {
        console.warn(
            `[Sakura] Could not initialize ${npcName}: incomplete state.`,
        );

        return {};
    }

    return applyInitialEmotions(
        character,
        initialState,
    );
}

function isValidNpcIdentifier(name) {
    return (
        typeof name === 'string' &&
        name.trim().length > 0 &&
        !/^unknown/i.test(name.trim())
    );
}

function applyEmotionDelta(
    character,
    delta,
) {
    const applied = {};

    if (
        !delta ||
        typeof delta !== 'object' ||
        Array.isArray(delta)
    ) {
        return applied;
    }

    for (
        const [
            rawEmotion,
            rawChange,
        ]
        of Object.entries(delta)
    ) {
        const emotion =
            normalizeEmotionName(
                rawEmotion,
            );

        if (
            !getEmotionList()
                .includes(emotion) ||
            character.locked[
                emotion
            ]
        ) {
            continue;
        }

        let change =
            Number(rawChange);

        if (
            !Number.isFinite(change)
        ) {
            continue;
        }

        const deltaLimit =
            getDeltaLimit();
        change =
            Math.max(
                -deltaLimit,
                Math.min(
                    deltaLimit,
                    Math.round(change),
                ),
            );

        if (change === 0) {
            continue;
        }

        const oldValue =
            character.emotions[
                emotion
            ];

        const newValue =
            clampEmotion(
                oldValue + change,
            );

        character.emotions[
            emotion
        ] = newValue;

        applied[emotion] = {
            from: oldValue,
            change,
            to: newValue,
        };
    }

    return applied;
}

function applyInactiveDrift(
    character,
) {
    for (
        const emotion
        of getEmotionList()
    ) {
        if (
            character.locked[
                emotion
            ]
        ) {
            continue;
        }

        const current =
            character.emotions[
                emotion
            ];

        if (
            Math.random() > 0.25
        ) {
            continue;
        }

        if (current >= 7) {
            character.emotions[
                emotion
            ] =
                clampEmotion(
                    current - 1,
                );
        }
    }
}

function applyMultiCharacterUpdate(
    update,
) {
    const state = getState();

    const active =
        Array.isArray(update.active)
            ? update.active
                .filter(
                    (name) =>
                        typeof name ===
                        'string',
                )
                .map(
                    (name) =>
                        name.trim(),
                )
                .filter(Boolean)
            : [];

    state.activeCharacters = [
        ...new Set(
            active.filter(isValidNpcIdentifier)
        )
    ];

    if (
        update.initialize &&
        typeof update.initialize ===
            'object' &&
        !Array.isArray(
            update.initialize,
        )
    ) {
        for (
            const [
                npcName,
                initialState,
            ]
            of Object.entries(
                update.initialize,
            )
        ) {
            const cleanName =
                typeof npcName ===
                'string'
                    ? npcName.trim()
                    : '';

            if (
                !isValidNpcIdentifier(cleanName) ||
                !initialState
            ) {
                console.warn(
                    `[Sakura] Rejected invalid NPC identifier: "${cleanName}"`,
                );
                continue;
            }

            initializeNpc(
                cleanName,
                initialState,
            );
        }
    }

    if (
        update.delta &&
        typeof update.delta ===
            'object' &&
        !Array.isArray(
            update.delta,
        )
    ) {
        for (
            const [
                npcName,
                delta,
            ]
            of Object.entries(
                update.delta,
            )
        ) {
            const cleanName =
                typeof npcName ===
                'string'
                    ? npcName.trim()
                    : '';

            if (!isValidNpcIdentifier(cleanName)) {
                continue;
            }

            const character =
                state.characters[cleanName];

            if (
                !character ||
                !character.initialized
            ) {
                console.warn(
                    `[Sakura] Skipped delta for "${cleanName}": not initialized.`,
                    structuredClone(delta),
                );
                continue
            }

            const applied = applyEmotionDelta(character, delta);

            console.log(
                `[Sakura] Delta result for "${cleanName}":`,
                structuredClone(applied),
                'Current values:',
                structuredClone(character.emotions),
            );
        }
    }

    for (
        const [
            npcName,
            character,
        ]
        of Object.entries(
            state.characters,
        )
    ) {
        if (
            !character.initialized ||
            state.activeCharacters
                .includes(npcName)
        ) {
            continue;
        }

        applyInactiveDrift(
            character,
        );
    }
}


/* -------------------------------------------------------
 * Floating editor button
 * ----------------------------------------------------- */

function isMobileLayout() {
    return window.matchMedia(
        '(max-width: 1000px)',
    ).matches;
}

function placeEmotionButton (
    button,
) {
    if (isMobileLayout()) {
        const leftSendForm =
            document.getElementById(
                'leftSendForm',
            );

        if (leftSendForm) {
            leftSendForm.appendChild(
                button,
            );

            button.classList.add(
                'sak-mobile-button',
            );

            return
        }
    }

    document.body.appendChild(
        button,
    );

    button.classList.remove(
        'sak-mobile-button',
    );
}

function createEmotionButton() {
    if (
        document.getElementById(
            'sakura-emotion-button',
        )
    ) {
        return;
    }

    const button =
        document.createElement(
            'button',
        );

    button.id =
        'sakura-emotion-button';

    button.type = 'button';

    button.innerHTML =
        '<i class="fa-solid fa-spa"></i>';

    button.title =
        'Sakura';

    button.addEventListener(
        'click',
        async () => {
            try {
                await openEmotionEditor();
            } catch (error) {
                console.error(
                    '[Sakura] Failed to open Emotion Editor:',
                    error,
                );

                toastr.error(
                    'Could not open the Emotion Editor.',
                );
            }
        },
    );

    placeEmotionButton(
        button,
    );
}

function repositionEmotionButton() {
    const button =
        document.getElementById(
            'sakura-emotion-button',
        );

    if (!button) {
        return;
    }

    placeEmotionButton(
        button,
    );
}


/* -------------------------------------------------------
 * Editor HTML
 * ----------------------------------------------------- */

function buildCharacterOptions(
    selectedName,
) {
    return getInitializedCharacterNames()
        .map(
            (name) => `
                <option
                    value="${escapeHtml(name)}"
                    ${name === selectedName
                        ? 'selected'
                        : ''}
                >
                    ${escapeHtml(name)}
                </option>
            `,
        )
        .join('');
}

function buildEmotionRows(
    emotions,
    character,
) {
    return getEmotionList()
        .map(
            (emotion) => {
                const value =
                    emotions[
                        emotion
                    ] ?? EMOTION_MIN;

                const locked =
                    character.locked
                        ?.[emotion] ??
                    false;

                const label =
                    formatEmotionLabel(
                        emotion,
                    );

                return `
                    <div
                        class="sak-emotion-row"
                        data-emotion-row="${escapeHtml(emotion)}"
                    >
                        <label
                            for="sak-emotion-${escapeHtml(emotion)}"
                        >
                            ${escapeHtml(label)}
                        </label>

                        <input
                            id="sak-emotion-${escapeHtml(emotion)}"
                            class="sak-emotion-input"
                            data-emotion="${escapeHtml(emotion)}"
                            type="number"
                            min="${EMOTION_MIN}"
                            max="${getEmotionMax()}"
                            step="1"
                            value="${value}"
                        />

                        <button
                            type="button"
                            class="sak-emotion-lock sak-squarebutt"
                            data-emotion="${escapeHtml(emotion)}"
                            data-locked="${locked}"
                            title="${locked
                                ? 'Unlock emotion'
                                : 'Lock emotion'}"
                        >
                            ${
                                locked
                                    ? '<i class="fa-solid fa-lock"></i>'
                                    : '<i class="fa-solid fa-lock-open"></i>'
                            }
                        </button>

                        <button
                            type="button"
                            class="sak-delete-emotion sak-squarebutt"
                            data-emotion="${escapeHtml(emotion)}"
                            title="Delete ${escapeHtml(label)}"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
            },
        )
        .join('');
}

function buildEmotionEditorHTML(
    characterName,
    draft,
) {
    const hasCharacters =
        Boolean(
            characterName &&
            draft,
        );

    return `
        <div id="sakura-editor">
            <button
                id="sak-editor-close"
                class="sak-squarebutt"
                type="button"
                title="Close"
            >
                <i class="fa-solid fa-x"></i>
            </button>

            <button
                id="sak-editor-settings"
                class="sak-squarebutt"
                type="button"
                title="Sakura Settings"
            >
                <i class="fa-solid fa-gear"></i>
            </button>

            ${
                hasCharacters
                    ? `
                        <div class="sak-character-selector">
                            <select id="sak-character-select">
                                ${buildCharacterOptions(
                                    characterName,
                                )}
                            </select>

                            <button
                                id="sak-delete-character"
                                class="sak-squarebutt"
                                type="button"
                                title="Delete selected character"
                                aria-label="Delete selected character"
                            >
                                <i class="fa-solid fa-trash"></i>
                            </button>

                            <button
                                id="sak-add-emotion"
                                class="sak-squarebutt"
                                type="button"
                                title="Add emotion"
                            >
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>

                        <div id="sak-add-emotion-panel" hidden>

                            <input
                                id="sak-add-emotion-input"
                                type="text"
                                maxlength="40"
                                autocomplete="off"
                                placeholder="New Emotion"
                            />

                            <div class="sak-add-emotion-actions">
                                <button
                                    id="sak-add-emotion-confirm"
                                    type="button"
                                    class="sak-menu-button"
                                >
                                    Add
                                </button>

                                <button
                                    id="sak-add-emotion-cancel"
                                    type="button"
                                    class="sak-menu-button"
                                >
                                    Cancel
                                </button>
                            </div>

                        </div>

                        <div id="sak-delete-emotion-panel" hidden>

                            <p id="sak-delete-emotion-message">
                            </p>

                            <div class="sak-delete-emotion-actions">
                                <button
                                    id="sak-delete-emotion-confirm"
                                    type="button"
                                    class="sak-menu-button"
                                >
                                    Delete
                                </button>

                                <button
                                    id="sak-delete-emotion-cancel"
                                    type="button"
                                    class="sak-menu-button"
                                >
                                    Cancel
                                </button>
                            </div>

                        </div>

                        <h2 id="sak-character-heading">
                            Emotions
                        </h2>

                        <div class="sak-emotion-grid">
                            ${buildEmotionRows(
                                draft.emotions,
                                draft,
                            )}
                        </div>

                        <div class="sak-editor-buttons">
                            <button
                                id="sak-emotion-manual-update"
                                type="button"
                                class="sak-menu-button"
                            >
                                Manual updates
                            </button>

                            <button
                                id="sak-emotion-save"
                                type="button"
                                class="sak-menu-button"
                            >
                                Save
                            </button>
                        </div>
                    `
                    : `
                        <div class="sak-no-characters">
                            <h2>
                                No Characters Initialized!
                            </h2>

                            <p>
                                Sakura will begin tracking
                                emotions when a character is
                                initialized.
                            </p>

                            <div class="sak-editor-buttons">
                                <button
                                    id="sak-emotion-manual-update"
                                    type="button"
                                    class="sak-menu-button"
                                >
                                    Manual Update
                                </button>
                            </div>
                        </div>
                    `
            }
        </div>
    `;
}

function refreshCharacterDropdown(
    selectedName = null,
) {
    const select =
        document.getElementById(
            'sak-character-select',
        );

    if (!select) {
        return;
    }

    const names =
        getInitializedCharacterNames();

    const currentSelection =
        selectedName ??
        select.value ??
        names[0];

    select.innerHTML =
        buildCharacterOptions(
            currentSelection,
        );
}


/* -------------------------------------------------------
 * Emotion editor
 * ----------------------------------------------------- */

async function openSakuraSettings() {
    const context =
        SillyTavern.getContext();

    const {
        Popup,
        POPUP_TYPE,
    } = context;

    const historyLimit =
        getHistoryLimit();

    const html = `
        <div id="sakura-settings">

            <button
                id="sak-settings-back"
                class="sak-squarebutt"
                type="button"
                title="Back"
            >
                <i class="fa-solid fa-arrow-left"></i>
            </button>

            <h2>
                Sakura Settings
            </h2>

            <div class="sak-setting-row">

                <input
                    id="sak-history-limit"
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    value="${historyLimit}"
                />

                <label
                    for="sak-history-limit"
                >
                    Emotion History
                </label>
            </div>

            <div class="sak-setting-row">
                <label for="sak-emotion-max">
                    Emotion Max
                </label>

                <input
                    id="sak-emotion-max"
                    type="number"
                    min="1"
                    step="1"
                    value="${getEmotionMax()}"
                />
            </div>

            <div class="sak-setting-row">
                <label for="sak-overdrive-min">
                    Overdrive Start
                </label>

                <input
                    id="sak-overdrive-min"
                    type="number"
                    min="1"
                    step="1"
                    value="${getOverdriveMin()}"
                />
            </div>

            <div class="sak-setting-row">
                <label for="sak-delta-limit">
                    Change Limit
                </label>

                <input
                    id="sak-delta-limit"
                    type="number"
                    min="1"
                    step="1"
                    value="${getDeltaLimit()}"
                />
            </div>

            <button
                id="sak-settings-save"
                type="button"
                class="sak-menu-button"
            >
                Save
            </button>

        </div>
    `;

    const popup =
        new Popup(
            html,
            POPUP_TYPE.TEXT,
            '',
            {
                wide: false,
                large: false,

                okButton: false,
                cancelButton: false,
            },
        );

    const popupPromise =
        popup.show();

    await waitForNextFrame();

    const historyLimitInput =
        document.getElementById(
            'sak-history-limit',
        );

    const emotionMaxInput =
        document.getElementById(
            'sak-emotion-max',
        );

    const overdriveMinInput =
        document.getElementById(
            'sak-overdrive-min',
        );

    const deltaLimitInput =
        document.getElementById(
            'sak-delta-limit',
        );

    const backButton =
        document.getElementById(
            'sak-settings-back',
        );

    backButton?.addEventListener(
        'click',
        async (event) => {
            event.stopPropagation();

            if (
                typeof popup.complete ===
                'function'
            ) {
                popup.complete(0);
            }

            await popupPromise;
            await waitForNextFrame();
            await openEmotionEditor();
        },
    );

    const saveButton =
        document.getElementById(
            'sak-settings-save',
        );

    saveButton?.addEventListener(
        'click',
        async () => {
            let value =
                Number(
                    historyLimitInput?.value,
                );

            const emotionMax =
                Math.round(
                    Number(
                        emotionMaxInput?.value,
                    ),
                );

            const overdriveMin =
                Math.round(
                    Number(
                        overdriveMinInput?.value,
                    ),
                );

            const deltaLimit =
                Math.round(
                    Number(
                        deltaLimitInput?.value,
                    ),
                );

            if (
                !Number.isFinite(value)
            ) {
                value =
                    DEFAULT_HISTORY_LIMIT;
            }

            value =
                Math.round(value);

            value =
                Math.max(
                    1,
                    Math.min(
                        500,
                        value,
                    ),
                );

            if (
                !Number.isFinite(emotionMax) ||
                emotionMax <= EMOTION_MIN
            ) {
                toastr.error(
                    'Must be greater than 0.'
                );

                return;
            }

            if (
                !Number.isFinite(overdriveMin) ||
                overdriveMin <= EMOTION_MIN ||
                overdriveMin > emotionMax
            ) {
                toastr.error(
                    'Must be between 1 and emotion maximum.'
                );

                return;
            }

            if (
                !Number.isFinite(deltaLimit) ||
                deltaLimit < 1
            ) {
                toastr.error(
                    'Must be at least 1.'
                );

                return;
            }

            const settings =
                getState().settings;

            settings.historyLimit =
                value;

            settings.emotionMax=
                emotionMax;

            settings.overdriveMin =
                overdriveMin;

            settings.deltaLimit=
                deltaLimit;

            for (
                const character
                of Object.values(
                    getState().characters,
                )
            ) {
                for (
                    const emotion
                    of getEmotionList()
                ) {
                    character.emotions[
                        emotion
                    ] =
                        clampEmotion(
                            character.emotions[
                                emotion
                            ],
                        );
                }
            }

            pruneSwipeHistory();

            await saveState();

            if (
                typeof context.saveChat ===
                    'function'
            ) {
                await context.saveChat();
            }

            updateEmotionPrompt();

            toastr.success(
                `Settings Saved.`,
            );
        },
    );

    await popupPromise;
}

async function openEmotionEditor(
    requestedCharacterName = null,
) {
    const context =
        SillyTavern.getContext();

    const state = getState();

    const characterNames =
        getInitializedCharacterNames();

    const drafts = {};

    for (
        const name
        of characterNames
    ) {
        const character =
            getCharacterState(name);

        drafts[name] = {
            emotions:
                structuredClone(
                    character.emotions,
                ),
            locked:
                structuredClone(
                    character.locked,
                ),
        };
    }

    let characterName =
        requestedCharacterName &&
        characterNames.includes(
            requestedCharacterName,
        )
            ? requestedCharacterName
            : characterNames.length > 0
                ? characterNames[0]
                : null;

    let draft =
        characterName
            ? drafts[characterName]
            : null;

    const {
        Popup,
        POPUP_TYPE,
    } = context;

    const popup =
        new Popup(
            buildEmotionEditorHTML(
                characterName,
                draft,
            ),
            POPUP_TYPE.TEXT,
            '',
            {
                wide: true,
                large: false,
                okButton: false,
                cancelButton: false,
                allowVerticalScrolling:
                    true,
            },
        );

    const popupPromise =
        popup.show();

    await waitForNextFrame();

    const editor =
        document.getElementById(
            'sakura-editor',
        );

    if (!editor) {
        console.error(
            '[Sakura] Editor DOM was not created.',
        );

        toastr.error(
            'Emotion Editor could not be initialized.',
        );

        if (
            typeof popup.complete ===
            'function'
        ) {
            popup.complete(0);
        }

        return;
    }

    const characterSelect =
        editor.querySelector(
            '#sak-character-select',
        );

    const characterHeading =
        editor.querySelector(
            '#sak-character-heading',
        );

    const saveButton =
        editor.querySelector(
            '#sak-emotion-save',
        );

    const manualUpdateButton =
        editor.querySelector(
            '#sak-emotion-manual-update',
        );

    const closeButton =
        editor.querySelector(
            '#sak-editor-close',
        );

    const addEmotionButton =
        editor.querySelector(
            '#sak-add-emotion',
        );

    const deleteCharacterButton =
        editor.querySelector(
            '#sak-delete-character',
        );

    const addEmotionPanel =
        editor.querySelector(
            '#sak-add-emotion-panel',
        );

    const addEmotionInput =
        editor.querySelector(
            '#sak-add-emotion-input',
        );

    const addEmotionConfirm =
        editor.querySelector(
            '#sak-add-emotion-confirm',
        );

    const addEmotionCancel =
        editor.querySelector(
            '#sak-add-emotion-cancel',
        );

    const lockButtons =
        editor.querySelectorAll(
            '.sak-emotion-lock',
        );

    const deleteEmotionButtons =
        editor.querySelectorAll(
            '.sak-delete-emotion',
        );

    const deleteEmotionPanel =
        editor.querySelector(
            '#sak-delete-emotion-panel',
        );

    const deleteEmotionMessage =
        editor.querySelector(
            '#sak-delete-emotion-message',
        );

    const deleteEmotionConfirm =
        editor.querySelector(
            '#sak-delete-emotion-confirm',
        );

    const deleteEmotionCancel =
        editor.querySelector(
            '#sak-delete-emotion-cancel',
        );

    let pendingDeleteEmotion =
        null;

    const settingsButton =
        editor.querySelector(
            '#sak-editor-settings',
        );

    for (
        const input
        of editor.querySelectorAll(
            '.sak-emotion-input',
        )
    ) {
        input.addEventListener(
            'change',
            async () => {
                const emotion =
                    input.dataset.emotion;

                if (
                    !emotion ||
                    !getEmotionList()
                        .includes(emotion)
                ) {
                    return;
                }
                const value =
                    clampEmotion(
                        input.value,
            );

            input.value = value;

            draft.emotions[
               emotion
            ] = value;

            const character =
                getCharacterState(
                    characterName,
                );

            character.emotions[
                emotion
            ] = value;

            await saveState();

            updateEmotionPrompt();
            },
        );
    }

    function captureCurrentDraft() {
        for (
            const input
            of editor.querySelectorAll(
                '.sak-emotion-input',
            )
        ) {
            const emotion =
                input.dataset.emotion;

            if (
                !getEmotionList()
                    .includes(emotion)
            ) {
                continue;
            }

            draft.emotions[
                emotion
            ] =
                clampEmotion(
                    input.value,
                );
        }

        for (
            const button
            of editor.querySelectorAll(
                '.sak-emotion-lock',
            )
        ) {
            const emotion =
                button.dataset.emotion;

            if (
                !getEmotionList()
                    .includes(emotion)
            ) {
                continue;
            }

            draft.locked[
                emotion
            ] =
                button.dataset.locked ===
                'true';
        }
    }

    function commitDraftsToState() {
        for (
            const name
            of characterNames
        ) {
            const character =
                getCharacterState(name);

            character.emotions =
                structuredClone(
                    drafts[name]
                        .emotions,
                );

            character.locked =
                structuredClone(
                    drafts[name]
                        .locked,
                );
        }
    }

    function displayCharacter(
        newName,
    ) {
        characterName = newName;
        draft =
            drafts[characterName];

        if (characterHeading) {
            characterHeading.textContent =
                `${characterName} — Emotions`;
        }

        for (
            const input
            of editor.querySelectorAll(
                '.sak-emotion-input',
            )
        ) {
            const emotion =
                input.dataset.emotion;

            if (
                !getEmotionList()
                    .includes(emotion)
            ) {
                continue;
            }

            input.value =
                draft.emotions[
                    emotion
                ] ?? EMOTION_MIN;
        }

        for (
            const button
            of editor.querySelectorAll(
                '.sak-emotion-lock',
            )
        ) {
            const emotion =
                button.dataset.emotion;

            if (
                !getEmotionList()
                    .includes(emotion)
            ) {
                continue;
            }

            const locked =
                draft.locked[
                    emotion
                ] ?? false;

            button.dataset.locked =
                String(locked);

            button.innerHTML =
                locked
                    ? '<i class="fa-solid fa-lock"></i>'
                    : '<i class="fa-solid fa-lock-open"></i>';

            button.title =
                locked
                    ? 'Unlock emotion'
                    : 'Lock emotion';
        }
    }

    async function closeAndReopenEditor() {
        if (
            typeof popup.complete ===
            'function'
        ) {
            popup.complete(0);
        }

        await popupPromise;
        await waitForNextFrame();

        await openEmotionEditor(
            characterName,
        );
    }

    characterSelect?.addEventListener(
        'change',
        () => {
            const newName =
                characterSelect.value;

            if (
                !newName ||
                !drafts[newName]
            ) {
                return;
            }

            captureCurrentDraft();
            displayCharacter(
                newName,
            );
        },
    );

    deleteCharacterButton?.addEventListener(
        'click',
        async (event) => {
            event.stopPropagation();
            const name = characterSelect?.value || characterName;
            if (!name) {
                return;
            }

            const confirmed = window.confirm(
                `Stop tracking "${name}" and delete its saved emotion history?`,
            );
            if (!confirmed) {
                return;
            }

            deleteCharacterButton.disabled = true;
            try {
                const deleted = await deleteTrackedCharacter(name);
                if (!deleted) {
                    toastr.warning('Character is no longer tracked.');
                    return;
                }
                delete drafts[name];
                const nextName = getInitializedCharacterNames()[0] ?? null;
                toastr.success(`${name} removed from Sakura tracking.`);

                if (typeof popup.complete === 'function') {
                    popup.complete(0);
                }
                await popupPromise;
                await waitForNextFrame();
                await openEmotionEditor(nextName);
            } catch (error) {
                console.error('[Sakura] Character deletion failed:', error);
                toastr.error('Could not delete the character.');
                deleteCharacterButton.disabled = false;
            }
        },
    );

    addEmotionButton?.addEventListener(
        'click',
        (event) => {
            event.stopPropagation();

            if (!addEmotionPanel) {
                return;
            }

            addEmotionPanel.hidden =
                false;

            if (addEmotionInput) {
                addEmotionInput.value =
                    '';

                addEmotionInput.focus();
            }
        },
    );

    async function addEmotionFromInput() {
        const rawName =
            addEmotionInput
                ?.value
                ?.trim();

        const emotion =
            normalizeEmotionName(
                rawName,
            );

        if (!emotion) {
            toastr.warning(
                'Please enter a valid emotion name.',
            );

            return;
        }

        if (
            getEmotionList()
                .includes(emotion)
        ) {
            toastr.warning(
                `${formatEmotionLabel(emotion)} already exists.`
            );

            return;
        }

        captureCurrentDraft();
        commitDraftsToState();

        getEmotionList().push(
            emotion,
        );

        for (
            const character
            of Object.values(
                state.characters,
            )
        ) {
            character.emotions[
                emotion
            ] = EMOTION_MIN;

            character.locked[
                emotion
            ] = false;
        }

        try {
            await saveState();

            updateEmotionPrompt();

            toastr.success(
                `${formatEmotionLabel(emotion)} added.`,
            );

            await closeAndReopenEditor();
        } catch (error) {
            console.error(
                '[Sakura] Failed to add emotion:',
                error,
            );

            toastr.error(
                'Could not add the emotion.'
            );
        }
    }

    addEmotionConfirm?.addEventListener(
        'click',
        async (event) => {
            event.stopPropagation();

            await addEmotionFromInput();
        },
    );

    addEmotionCancel?.addEventListener(
        'click',
        (event) => {
            event.stopPropagation();

            if (addEmotionPanel) {
                addEmotionPanel.hidden =
                    true;
            }

            if (addEmotionInput) {
                addEmotionInput.value =
                    '';
            }
        },
    );

    addEmotionInput?.addEventListener(
        'keydown',
        async(event) => {
            if (event.key === 'Enter') {
                event.preventDefault();

                await addEmotionFromInput();
            }

            if (event.key === 'Escape') {
                event.preventDefault();

                if (addEmotionPanel) {
                    addEmotionPanel.hidden =
                        true;
                }

                addEmotionInput.value =
                    '';
            }
        },
    );


    for (
        const button
        of deleteEmotionButtons
    ) {
        button.addEventListener(
            'click',
            (event) => {
                event.stopPropagation();

                const emotion =
                    button.dataset.emotion;

                if (
                    !emotion ||
                    !getEmotionList()
                        .includes(emotion)
                ) {
                    return;
                }

                pendingDeleteEmotion =
                    emotion;

                const label =
                    formatEmotionLabel(
                        emotion,
                    );

                if (deleteEmotionMessage) {
                    deleteEmotionMessage
                        .textContent =
                        `Delete "${label}"? This is permanent and will be removed for every character!`
                }

                if (deleteEmotionPanel) {
                    deleteEmotionPanel.hidden =
                        false;
                }
            },
        );
    }

    async function deletePendingEmotion() {
        const emotion =
            pendingDeleteEmotion;

        if (
            !emotion ||
            !getEmotionList()
                .includes(emotion)
        ) {
            return;
        }

        const label =
            formatEmotionLabel(
                emotion,
            );

        captureCurrentDraft();
        commitDraftsToState();

        const emotions =
            getEmotionList();

        const index =
            emotions.indexOf(
                emotion,
            );

        if (index !== -1) {
            emotions.splice(
                index,
                1,
            );
        }

        for (
            const character
            of Object.values(
                state.characters,
            )
        ) {
            delete character
                .locked[
                    emotion
                ];
        }

        try {
            await saveState();

            updateEmotionPrompt();

            toastr.success(
                `${label} deleted.`,
            );

            pendingDeleteEmotion =
                null;

            await closeAndReopenEditor();
        } catch (error) {
            console.error(
                '[Sakura] Failed to delete emotion:',
                error,
            );

            toastr.error(
                'Failed to delete emotion.',
            );
        }
    }

    deleteEmotionConfirm
        ?.addEventListener(
            'click',
            async (event) => {
                event.stopPropagation();

                await deletePendingEmotion();
            },
        );

    deleteEmotionCancel
        ?.addEventListener(
            'click',
            (event) => {
                event.stopPropagation();

                pendingDeleteEmotion =
                    null;

                if (deleteEmotionPanel) {
                    deleteEmotionPanel.hidden =
                        true;
                }
            },
        );

    for (
        const button
        of lockButtons
    ) {
        button.addEventListener(
            'click',
            (event) => {
                event.stopPropagation();

                const newLocked =
                    button.dataset.locked !==
                    'true';

                button.dataset.locked =
                    String(newLocked);

                button.innerHTML =
                    newLocked
                        ? '<i class="fa-solid fa-lock"></i>'
                        : '<i class="fa-solid fa-lock-open"></i>';

                button.title =
                    newLocked
                        ? 'Unlock emotion'
                        : 'Lock emotion';
            },
        );
    }

    saveButton?.addEventListener(
        'click',
        async () => {
            captureCurrentDraft();
            commitDraftsToState();

            try {
                await saveState();
                updateEmotionPrompt();

                toastr.success(
                    'All character emotions saved.',
                );

                console.log(
                    '[Sakura] Saved all character emotion states:',
                    structuredClone(
                        drafts,
                    ),
                );
            } catch (error) {
                console.error(
                    '[Sakura] Failed to save emotion states:',
                    error,
                );

                toastr.error(
                    'Could not save emotion states.',
                );
            }
        },
    );

    manualUpdateButton?.addEventListener(
        'click',
        async (event) => {
            event.stopPropagation();

            if (manualUpdateButton.disabled) {
                return;
            }

            manualUpdateButton.disabled = true;
            const originalLabel = manualUpdateButton.textContent;
            manualUpdateButton.textContent = 'Updating emotions…';

            try {
                const success =
                    await recoverLatestAssistantEmotionUpdate();

                if (!success) {
                    return;
                }

                // Do not reopen the editor here. If the user closed it
                // while the raw generation was running, reopening creates
                // a surprising popup that appears impossible to dismiss.
                // If it remains open, close it so the next open shows the
                // newly initialized characters and recalculated emotions.
                if (
                    editor.isConnected &&
                    typeof popup.complete === 'function'
                ) {
                    popup.complete(0);
                }
            } catch (error) {
                console.error(
                    '[Sakura] Manual update button failed:',
                    error,
                );
                toastr.error(
                    'Could not perform manual emotion recovery.',
                );
            } finally {
                manualUpdateButton.disabled = false;
                manualUpdateButton.textContent = originalLabel;
            }
        },
    );

    settingsButton?.addEventListener(
        'click',
        async (event) => {
            event.stopPropagation();

            if (
                typeof popup.complete ===
                    'function'
            ) {
                popup.complete(0);
            }

            await popupPromise;
            await waitForNextFrame();
            await openSakuraSettings();
        },
    );

    closeButton?.addEventListener(
        'click',
        () => {
            if (
                typeof popup.complete ===
                'function'
            ) {
                popup.complete(0);
            }
        },
    );

    const popupElement =
        editor.closest('.popup');

    popupElement?.addEventListener(
        'click',
        (event) => {
            const clickedInsideEditor =
                event
                    .composedPath()
                    .includes(editor);

            if (
                clickedInsideEditor
            ) {
                return;
            }

            if (
                typeof popup.complete ===
                'function'
            ) {
                popup.complete(0);
            }
        },
    );

    await popupPromise;
}


/* -------------------------------------------------------
 * SillyTavern event handlers
 * ----------------------------------------------------- */

async function handleChatChanged() {
    const context =
        SillyTavern.getContext();

    const lastMessage =
        context.chat?.at(-1);

    if (lastMessage) {
        const snapshot =
            getStateAfterMessage(
                lastMessage,
            );

        if (snapshot) {
            restoreEmotionSnapshot(
                snapshot,
            );

            await saveState();
        }
    }

    pruneSwipeHistory();

    updateEmotionPrompt();
    refreshCharacterDropdown();
}

async function reconcileEmotionHistory() {
    const context = SillyTavern.getContext();
    const chat = context.chat ?? [];

    let snapshot = null;

    // Search backward through surviving messages.
    for (let i = chat.length - 1; i >= 0; i--) {
        snapshot = getStateAfterMessage(chat[i]);

        if (snapshot) {
            break;
        }
    }

    // No historical snapshot exists.
    // Return to the initial empty character state.
    if (!snapshot) {
        snapshot = {
            characters: {},
            activeCharacters: [],
            emotions: structuredClone(BASE_EMOTIONS),
        };
    }

    restoreEmotionSnapshot(snapshot);

    await saveState();

    updateEmotionPrompt();
    refreshCharacterDropdown();
}

function handleGenerationAboutToStart() {
    updateEmotionPrompt();
}

async function handleMessageDeleted() {
    await reconcileEmotionHistory();
}

async function handleMessageReceived() {
    const context =
        SillyTavern.getContext();

    const message =
        context.chat?.at(-1);

    if (
        !message ||
        message.is_user
    ) {
        return;
    }

    const originalText =
        message.mes ?? '';

    const update =
        extractEmotionUpdate(
            originalText,
        );

    if (!update) {
        const hasOpeningTag =
            /<emotion_update>/i.test(originalText);

        const hasClosingTag =
            /<\/emotion_update>/i.test(originalText);

    console.warn('[Sakura] Emotion extraction failed:', {
        hasOpeningTag,
        hasClosingTag,
        messageLength: originalText.length,
        messageEnd: originalText.slice(-1500),
    });

    return;
    }

    applyMultiCharacterUpdate(
        update,
    );

    const swipeId =
        getCurrentSwipeId(
            message,
        );

    const snapshot =
        createEmotionSnapshot();

    setSwipeEmotionState(
        message,
        swipeId,
        snapshot,
    );

    setMessageEmotionState(
        message,
        snapshot,
    );

    message.mes =
        originalText
            .replace(
                EMOTION_UPDATE_REGEX,
                '',
            )
            .trim();

    const messageIndex =
        context.chat.length - 1;

    if (
        typeof context.updateMessageBlock ===
            'function'
    ) {
        context.updateMessageBlock(
            messageIndex,
            message,
            {
                rerenderMessage: true,
            },
        );
    }

    pruneSwipeHistory();

    await saveState();

    if (
        typeof context.saveChat ===
            'function'
    ) {
        await context.saveChat();
    }

    updateEmotionPrompt();
    refreshCharacterDropdown();

    console.log(
        '[Sakura] Multi-character emotion state updated:',
        structuredClone(
            getState(),
        ),
    );
}

async function handleMessageSent(
    messageIndex,
) {
    const context =
        SillyTavern.getContext();

    const message =
        context.chat[
            messageIndex
        ];

    if (
        !message ||
        !message.is_user
    ) {
        return;
    }

    setMessageEmotionState(
        message,
        createEmotionSnapshot(),
    );

    if (
        typeof context.saveChat ===
            'function'
    ) {
        await context.saveChat();
    }
}

async function handleMessageSwiped(
    messageIndex,
) {
    const context =
        SillyTavern.getContext();

    const message =
        context.chat[
            messageIndex
        ];

    if (
        !message ||
        message.is_user
    ) {
        return;
    }

    const swipeId =
        getCurrentSwipeId(
            message,
        );

    const swipeState =
        getSwipeEmotionState(
            message,
            swipeId,
        );

    if (swipeState) {
        restoreEmotionSnapshot(
            swipeState,
        );
    } else {
        const baseline =
            getStateBeforeMessage(
                messageIndex,
            );

        if (baseline) {
            restoreEmotionSnapshot(
                baseline,
            );
        }
    }

    await saveState();

    updateEmotionPrompt();
    refreshCharacterDropdown();
}


/* -------------------------------------------------------
 * Initialization
 * ----------------------------------------------------- */

function initializeSakura() {
    createEmotionButton();
    updateEmotionPrompt();

    console.log(
        '[Sakura] Emotion Engine loaded.',
    );
}

const {
    eventSource,
    event_types,
} = SillyTavern.getContext();

eventSource.on(
    event_types.APP_READY,
    initializeSakura,
);

eventSource.on(
    event_types.CHAT_CHANGED,
    handleChatChanged,
);

eventSource.on(
    event_types.GENERATION_AFTER_COMMANDS,
    handleGenerationAboutToStart,
);

eventSource.on(
    event_types.MESSAGE_RECEIVED,
    handleMessageReceived,
);

eventSource.on(
    event_types.MESSAGE_SENT,
    handleMessageSent,
);

eventSource.on(
    event_types.MESSAGE_SWIPED,
    handleMessageSwiped,
);

eventSource.on(
    event_types.MESSAGE_DELETED,
    handleMessageDeleted,
);

window.addEventListener(
    'resize',
    repositionEmotionButton,
);
