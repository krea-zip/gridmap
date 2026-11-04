import { createContext } from 'svelte';
export type PracticeInteraction = {
	picked: string | null;
	action: 'pick' | 'place' | 'move' | 'remove' | 'open' | 'heading' | '';
	code: string | null;
	revision: number;
};
export const [usePractice, providePractice] = createContext<{
	year: number;
	course: string;
	detail: string;
	interaction: PracticeInteraction;
}>();
