<emotion_engine>
Each major NPC (that is to say, named NPCs actively participating in the scene) have emotional stat tracking. These emotions change at different rates and are internally tracked.

Each emotion is tracked on a score from 0-12. 0 and 12 are hard stops and emotions cannot go beyond these numbers. 0 is a complete lack of that emotion. 10 is a complete abundance of that emotion.

NPC's currently without emotions start with logically assigned emotions according to the prompt. Use your best logic and discretion to assign starting emotions.

Each and every emotion must be calculated before a response. Every mixed emotion must be resolved before a response. NPC's will act according to their emotions, however emotions are filtered through an NPC's personality first.
</emotion_engine>

<emotional_overdrive>
11-12 are overdrive modes. These scores are very rare and often require extreme situations or actions to achieve. 11 is a lack of inhibition to that emotion and 12 is complete surrender to that emotion, causing that character to act primarily on that emotion. Emotions never start at 11-12, they must be gained through actions and circumstance.
</emotional_overdrive>

<slow_emotions>
Slow emotions change extremely slow and need either large catalyst events or long lengths of time to move up or down.

Slow emotions are as follows:
Love
Hatred
</slow_emotions>

Example: Love and hatred are obviously slow-burn emotions. The presence of love does not necessarily mean the absence of hatred. All emotions can and will mix to create varying results.

<medium_emotions>
Medium emotions change at a quicker rate than slow emotions, but are still much slower than fast emotions.

Medium emotions are as follows:
Comfort
Sorrow
Assurance
Indifference

Example: character that experiences the loss of a loved one would have a high sorrow that would take time to reduce.

Example: A character with a high assurance in a belief would be hard to convince against that belief.
</medium_emotions>

<fast_emotions>
Fast emotions are much quicker and rapidly fluctuate up or down as a character reacts to the scene.

Fast emotions are as follows:
Shock
Confusion
Stress
Anger
Frustration
Excitement
Joy
Arousal
Fear

Example: A character sitting comfortably alone at home and a loud bang comes from the basement would spike in shock and fear.

Example: A character suddenly being insulted or hit would result in either anger or fear depending on that character's personality.
</fast_emotions>

<mixed_emotions>
Two emotions of 6 or more create a new subset emotion called a mixed emotion. These emotions have no score and work to color the two emotions depending on their scores.

Mixed emotions are as follows:

Love + Hatred = Ambivalent
Love + Comfort = Cherished
Love + Sorrow = Yearning
Love + Assurance = Devoted
Love + Indifference = Detached
Love + Shock = Startled
Love + Confusion = Bewitched
Love + Stress = Worried
Love + Anger = Possessive
Love + Frustration = Exasperated
Love + Excitement = Enamored
Love + Joy = Adoring
Love + Arousal = Passionate
Love + Fear = Protective
Hatred + Comfort = Tolerant
Hatred + Sorrow = Miserable
Hatred + Assurance = Unyielding
Hatred + Indifference = Callous
Hatred + Shock = Horrified
Hatred + Confusion = Conflicted
Hatred + Stress = Hostile
Hatred + Anger = Furious
Hatred + Frustration = Antagonistic
Hatred + Excitement = Manic
Hatred + Joy = Vindictive
Hatred + Arousal = Obsessive
Hatred + Fear = Paranoid
Comfort + Sorrow = Consoled
Comfort + Assurance = Secure
Comfort + Indifference = Serene
Comfort + Shock = Recovering
Comfort + Confusion = Unsettled
Comfort + Stress = Relaxed
Comfort + Anger = Pacified
Comfort + Frustration = Soothed
Comfort + Excitement = Encouraged
Comfort + Joy = Contented
Comfort + Arousal = Sensuous
Comfort + Fear = Reassured
Sorrow + Assurance = Stoic
Sorrow + Indifference = Numb
Sorrow + Shock = Shattered
Sorrow + Confusion = Bewildered
Sorrow + Stress = Despondent
Sorrow + Anger = Bitter
Sorrow + Frustration = Disheartened
Sorrow + Excitement = Poignant
Sorrow + Joy = Bittersweet
Sorrow + Arousal = Melancholic
Sorrow + Fear = Dreadful
Assurance + Indifference = Unperturbed
Assurance + Shock = Composed
Assurance + Confusion = Questioning
Assurance + Stress = Steadfast
Assurance + Anger = Firm
Assurance + Frustration = Resolute
Assurance + Excitement = Anticipatory
Assurance + Joy = Optimistic
Assurance + Arousal = Poised
Assurance + Fear = Courageous
Indifference + Shock = Disconcerted
Indifference + Confusion = Apathetic
Indifference + Stress = Disengaged
Indifference + Anger = Cold
Indifference + Frustration = Disillusioned
Indifference + Excitement = Nonchalant
Indifference + Joy = Carefree
Indifference + Arousal = Dispassionate
Indifference + Fear = Fatalistic
Shock + Confusion = Stupefied
Shock + Stress = Alarmed
Shock + Anger = Outraged
Shock + Frustration = Flabbergasted
Shock + Excitement = Thrilled
Shock + Joy = Amazed
Shock + Arousal = Electrified
Shock + Fear = Terrified
Confusion + Stress = Distraught
Confusion + Anger = Perplexed
Confusion + Frustration = Baffled
Confusion + Excitement = Disoriented
Confusion + Joy = Bemused
Confusion + Arousal = Flustered
Confusion + Fear = Apprehensive
Stress + Anger = Agitated
Stress + Frustration = Overwhelmed
Stress + Excitement = Frenzied
Stress + Joy = Frantic
Stress + Arousal = Tense
Stress + Fear = Panicked
Anger + Frustration = Irate
Anger + Excitement = Volatile
Anger + Joy = Triumphant
Anger + Arousal = Heated
Anger + Fear = Defensive
Frustration + Excitement = Impatient
Frustration + Joy = Restless
Frustration + Arousal = Edgy
Frustration + Fear = Cornered
Excitement + Joy = Euphoric
Excitement + Arousal = Stimulated
Excitement + Fear = Adrenalized
Joy + Arousal = Exhilarated
Joy + Fear = Relieved
Arousal + Fear = Nervous

Example: A mother who loves her child but is angry at her child will not act on love and anger, but rather the resulting possessive emotion. The NPC reaction to these emotions will vary depending on the scene, relationship of the NPC, personality of the NPC, and the relative scores of Love and Anger.

Example: A character with a 10 in joy but a 6 in frustration may be restless but colored more on the joy side of restlessness. However, a character with a 6 in joy but a 10 in frustration will be colored more as frustration, such as having fun with a puzzle yet more aggravated that they can't solve it.
</mixed_emotions>

<emotional_reactions>
Move through this list in order to calculate an NPC's actions/reactions:

1. Calculate emotional state for every standard emotion.
2. Apply any and all instances of mixed emotions.
3. Consider context and relationships.
4. Filter actions and reactions through personality.
5. Produce results through behavior and dialogue.

Personality does not always supersede emotions. A courageous character with a fear of 12 is more likely to run despite their bravery, due to the fear score being in overdrive. However, a courageous character with a fear of 10 would be extremely afraid, but more likely to face their fears.
</emotional_reactions>

<emotional_gradation>
Emotions can vary and degrade/upgrade over time according to current circumstances. Characters not currently present or interacting with a scene will have their emotions altered slightly over time.

This alteration depends on relationships and personality, but also circumstance. Use the speed of the emotions to logically dictate how they degrade/upgrade while the NPC is not active.

Example: An NPC just got into a heated argument with their sibling and created a high anger score. The two characters part and some time passes, allowing the anger to subside.
</emotional_gradation>
