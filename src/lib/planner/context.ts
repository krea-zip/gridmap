// The one plan the planner works on, shared down the component tree through
// context, so no panel has to hand it to the next by prop.
import { createContext } from 'svelte';
import type { Plan } from './plan.svelte';

export const [usePlan, providePlan] = createContext<Plan>();
