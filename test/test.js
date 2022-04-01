import { Ciam } from '../dist/index.js'

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyNDE2MDFmNTlkOGU5Nzg0OGRjY2VlOCIsInR5cGUiOjAsImlhdCI6MTY0ODQ1MTg1NiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDoxMDEwNSJ9.fgqwtOGDTMhhnRZhfqgRraNyl7becJDh_Pd2Hex84S8'

const api = new Ciam(token, 'http://localhost:10105')

async function test() {
	const res = await api.getUser('6241601f59d8e97848dccee8')
	console.log(res)
	return 0
}

test()