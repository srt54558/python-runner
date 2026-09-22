const KEY = 'kplus-open-docs';

export function requestDocsPopup() {
	sessionStorage.setItem(KEY, '1');
}

export function takeDocsPopup() {
	if (sessionStorage.getItem(KEY) !== '1') return false;
	sessionStorage.removeItem(KEY);
	return true;
}
