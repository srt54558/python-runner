declare module 'virtual:dependency-versions' {
	export const dependencyVersions: ReadonlyArray<{
		name: string;
		version: string;
		dev: boolean;
	}>;
}
