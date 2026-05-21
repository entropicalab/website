---
title: 'why the model comes first.'
slug: why-the-model-comes-first
locale: en
eyebrow: '// the boring part'
summary: a short note on why we simulate before we draw, and why the order matters more than the software.
date: 2026-05-01
author: josé barría
draft: false
---

most architecture practices that talk about simulation reach for the model after the
section is committed. by then the model has nothing to do but verify, and verification
is the part that produces a number, but the number arrives too late to argue with the
section that produced it.

we work the other way around. the first model we run on a project is asked before
the section exists. it's small, fast, and asks a single question: which orientation
costs the least to cool? which face needs the most shade? where does the daylight
fail at noon?

the model that answers those questions is rarely the same model we hand to the
engineer at the end. it's smaller, faster, and missing most of what a final model
needs. it doesn't have to be accurate to be useful. it has to be **early**.

## three uses for an early model

**radiation on the massing.** the cheapest possible model: a block, the climate file,
and a year of solar exposure. this is the model that picks the orientation, sizes the
shading depth, and tells you which face to put the glazing on. it runs in minutes
and it makes the first move of the project for you.

**daylight at the seating plane.** a useful daylight illuminance reading at the place
people actually work. this is the model that argues with deep plans, low ceilings,
and the temptation to wallpaper the walls. it costs hours, not days.

**load by envelope variant.** the model that compares three or four reasonable
envelopes. this is where the chiller gets smaller, not because the engineer
sized it carefully, but because the building asked for less.

each one is a small conversation. none of them are a deliverable. that's the
point. the model isn't there to convince someone, it's there to make a
decision easier than it would have been without it.

---

## what we don't do

we don't run a single, finished, beautiful model at the end of a project.
we don't put it in the deck. we don't print it on a board. by the time you can
make a model that beautiful, the building has already decided what it wants
to be, and the model is documentation. documentation is fine, but the
**simulation that earned the section** is the one that ran in week two.

that's the boring part. it's also where the savings live.
