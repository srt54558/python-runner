export default {
	fetch(request) {
		const url = new URL(request.url);
		url.protocol = 'https:';
		url.hostname = 'coder.k-plus.one';
		url.port = '';
		return Response.redirect(url, 301);
	}
};
