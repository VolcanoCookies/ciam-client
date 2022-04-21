import axios, { Axios, AxiosError, AxiosResponse } from 'axios';
import { CheckResult, discordId, DiscordUser, flag, inRange, min, notEmpty, objectId, oneOf, Permission, Role, strictFlag, User } from 'ciam-commons';




class InvalidToken extends Error {
	constructor(token: string) {
		super(`Invalid ciam token "${token}"`);
		this.name = 'InvalidToken';
	}
}

class PermissionError extends Error {
	constructor(missing: Array<string>) {
		super(`Missing permissions: [${missing.join(', ')}]`);
		this.name = 'PermissionError';
	}
}

function cast<T>(obj: any): T | undefined {
	return obj ? obj as T : undefined;
}

class Ciam {
	token: string;
	baseUrl: string;
	domain: string;

	api: Axios;

	self!: User;

	constructor(token: string, baseUrl: string, domain: string) {
		this.token = token;
		this.baseUrl = baseUrl;
		this.domain = domain;
		this.api = axios;
		this.setToken(token);

		this.api.interceptors.response.use(function (response) {
			return response;
		}, function (error: Error | AxiosError) {
			if (axios.isAxiosError(error) && error.response?.data?.missing) {
				const missing: Array<string> = error.response?.data?.missing || [];
				return Promise.reject(new PermissionError(missing));
			} else return Promise.reject(error);
		});
	}

	async setToken(token: string) {
		this.token = token;
		this.api = axios.create({
			baseURL: this.baseUrl,
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		const validRes = await this.api.get('/user/me');
		if (validRes.status != 200) return Promise.reject(new InvalidToken(token));
		else this.self = await validRes.data as User;
	}

	/**
	 * Get a role by its roleId
	 * 
	 * @permissions `ciam.role.get.ROLE_ID`
	 * @param roleId the id of the role to get
	 * @returns A {@link Role}, or undefined
	 * @throws if {@link roleId} is not a valid objectId
	 */
	async getRole(roleId: string): Promise<Role | undefined> {
		objectId(roleId);
		return cast<Role>(await this.api.get(`/role/${roleId}`));
	}

	/**
	 * Delete a role by its roleId
	 * 
	 * @permissions `ciam.role.delete.ROLE_ID`
	 * @param roleId the id of the role to delete
	 * @returns the deleted {@link Role}, or undefined
	 * @throws if {@link roleId} is not a valid objectId
	 */
	async deleteRole(roleId: string): Promise<Role | undefined> {
		objectId(roleId);
		return cast<Role>(await this.api.delete(`/role/${roleId}`));
	}

	/**
	 * Create a new role
	 * 
	 * @permissions `ciam.role.create`
	 * @param name the name of this role
	 * @param description the description of this role
	 * @param permissions the permissions of this role
	 * @returns the new {@link Role}, or undefined
	 * @throws if {@link name} is empty
	 * @throws if {@link description} is empty
	 * @throws if {@link permissions} contains invalid flags
	 */
	async createRole(name: string, description: string, permissions: Array<string>): Promise<Role | undefined> {
		notEmpty(name, 'name');
		notEmpty(description, 'description');
		permissions.forEach(f => flag(f));
		const obj = {
			name: name,
			description: description,
			permissions: permissions
		};
		return cast<Role>(await this.api.post('/role/create', obj));
	}

	/**
	 * Update an existing role
	 * 
	 * @permissions `ciam.role.update.ROLE_ID`
	 * @param role the role to update, with its fields modified to the desired values. Empty fields remain unchanged
	 * @returns the updated {@link Role}, or undefined
	 * @throws if {@link role}._id is not a valid objectId
	 * @throws if {@link role}.name exists and is empty
	 * @throws if {@link role}.description exists and is empty
	 * @throws if {@link role}.permissions contains invalid stict permission flags
	 */
	async updateRole(role: Role): Promise<Role | undefined> {
		objectId(role._id);
		role.permissions?.forEach(p => flag(p));
		if (role.name) notEmpty(role.name, 'role.name');
		if (role.description) notEmpty(role.name, 'role.description');
		return cast<Role>(await this.api.post('/role/update', role));
	}

	/**
	 * List roles
	 * 
	 * @permissions `ciam.role.list`
	 * @param skip number of roles to skip
	 * @param limit maximum number of roles to return in one request
	 * @returns an array of {@link Role}, or undefined
	 * @throws if {@link skip} is less than 0
	 * @throws if {@link limit} is not in the range 1..100
	 */
	async listRoles(skip: number = 0, limit: number = 100): Promise<Array<Role> | undefined> {
		min(skip, 0, 'skip');
		inRange(limit, 1, 100, 'limit');
		return cast<Array<Role>>(await this.api.get(`/role/list?skip=${skip}&limit=${limit}`));
	}

	/**
	 * Create a new user
	 * 
	 * @permissions `ciam.user.create`
	 * @param name the name of this user
	 * @param roles the roles of this user
	 * @param permissions the permissions of this user
	 * @param discord the discord object of this user
	 * @returns the newly created {@link User}, or unefined
	 * @throws if {@link name} is empty
	 * @throws if {@link discord}.id is not a valid discord id
	 * @throws if {@link roles} contain invalid objectIds
	 * @throws if {@link permissions} contains invalid flags
	 */
	async createUser(name: string, roles: Array<string>, permissions: Array<string>, discord: DiscordUser): Promise<User | undefined> {
		notEmpty(name, 'name');
		if (discord) discordId(discord.id, 'discord.id');
		roles.forEach(r => objectId(r));
		permissions.forEach(p => flag(p));
		const obj = {
			name: name,
			roles: roles,
			permissions: permissions,
			discord: discord
		};
		return cast<User>(await this.api.post('/user/create', obj));
	}

	/**
	 * Get a user by their id
	 * 
	 * @permissins `ciam.user.get.USER_ID`
	 * @param userId the id of the user to get
	 * @returns the {@link User}, or undefined
	 * @throws if {@link userId} is not a valid objectId
	 */
	async getUser(userId: string): Promise<User | undefined> {
		objectId(userId);
		return cast<User>(await this.api.get(`/user/${userId}`));
	}

	/**
	 * Delete a user by their id
	 * 
	 * @permissions `ciam.user.delete.USER_ID`
	 * @param userId id of the user to delete
	 * @returns the deleted {@link User}, or undefined
	 * @throws if {@link userId} is not a valid objectId
	 */
	async deleteUser(userId: string) {
		objectId(userId);
		return cast<Role>(await this.api.delete(`/role/${userId}`));
	}

	/**
	 * Update a user
	 * 
	 * @permissions `ciam.user.update.USER_ID`
	 * @param user the user to update, with their fields modified to the desired values. Empty fields remain unchanged
	 * @returns the updated {@link User}, or undefined
	 * @throws if {@link user}._id is not a valid objectId
	 * @throws if {@link user}.name exists and is empty
	 * @throws if {@link user}.discord.id is not a valid discord id
	 * @throws if {@link user}.roles contain invalid objectIds
	 * @throws if {@link user}.permissions contains invalid flags
	 */
	async updateUser(user: User): Promise<User | undefined> {
		objectId(user._id);
		if (user.discord) discordId(user.discord?.id, 'discord.id');
		user.roles?.forEach(r => objectId(r));
		user.permissions?.forEach(p => flag(p));
		if (user.name) notEmpty(user.name, 'user.name');
		return cast<User>(await this.api.post('/user/update'));
	}

	/**
	 * List users
	 * 
	 * @permissions `ciam.user.list`
	 * @param skip number of users to skip
	 * @param limit maximum number of users to return in one request
	 * @returns an array of {@link Role}, or undefined
	 * @throws if {@link skip} is less than 0
	 * @throws if {@link limit} is not in the range 1..100
	 */
	async listUsers(skip: number = 0, limit: number = 100): Promise<Array<User> | undefined> {
		min(skip, 0, 'skip');
		inRange(limit, 1, 100, 'limit');
		return cast<Array<User>>(await this.api.get(`/user/list?skip=${skip}&limit=${limit}`));
	}

	/**
	 * Check if the current token is valid
	 *
	 * @returns true if the current ciam token is valid
	 */
	async valid(): Promise<boolean> {
		return this.api.get('/user/valid')
			.then(res => true)
			.catch(err => false);
	}

	/**
	 * Get a permission by its flag
	 * 
	 * @permissions `ciam.permission.get.FLAG`
	 * @param flag the flag to get permissions for
	 * @returns the {@link Permission} for this flag, or undefined
	 * @throws if {@link flag} is not a valid strict flag
	 */
	async getPermission(flag: string): Promise<Permission | undefined> {
		strictFlag(flag);
		return cast<Permission>(await this.api.get(`/permission/${flag}`));
	}

	/**
	 * Delete a permission by its flag
	 * 
	 * @permissions `ciam.permission.delete.FLAG`
	 * @param flag the flag to delete
	 * @returns the deleted {@link Permission}, or undefined
	 * @throws if {@link flag} is not a valid strict flag
	 */
	async deletePermission(flag: string): Promise<Permission | undefined> {
		strictFlag(flag);
		return cast<Permission>(await this.api.delete(`/permission/${flag}`));
	}

	/**
	 * Create a new permission
	 * 
	 * @permissions `ciam.permission.create.FLAG`
	 * @param name the name of this permission
	 * @param description the description of this permission
	 * @param flag the flag of this permission
	 * @returns the new {@link Permission}, or undefined
	 * @throws if {@link name} is empty
	 * @throws if {@link description} is empty
	 * @throws if {@link flag} is not a valid strict flag
	 */
	async createPermission(name: string, description: string, flag: string): Promise<Permission | undefined> {
		notEmpty(name, 'name');
		notEmpty(description, 'description');
		strictFlag(flag);
		const obj = {
			name: name,
			description: description,
			flag: flag
		};
		return cast<Permission>(await this.api.post('/permission/create', obj));
	}

	/**
	 * Update a permission
	 * 
	 * @permissions `ciam.permission.update.FLAG`
	 * @param permission the permission to update, with its fields modified to the desired values. Empty fields remain unchanged
	 * @returns the updated {@link Permission}, or undefined
	 * @throws if {@link permission}.flag is not a valid strict flag
	 * @throws if {@link permission}.name exists and is empty
	 * @throws if {@link permission}.description exists and is empty
	 */
	async updatePermission(permission: Permission): Promise<Permission | undefined> {
		strictFlag(permission.flag);
		if (permission.name) notEmpty(permission.name, 'permission.description');
		if (permission.description) notEmpty(permission.description, 'permission.description');
		return cast<Permission>(await this.api.post('/permission/update', permission));
	}

	/**
	 * Get a list of your own permissions
	 * 
	 * @permissions `ciam.permission.me`
	 * @param skip number of permissions to skip
	 * @param limit maximum number of permissions to return
	 * @returns an array of {@link Permission}, or undefined
	 * @throws if {@link skip} is less than 0
	 * @throws if {@link limit} is not in the range 1..100
	 */
	async ownPermissions(skip: number = 0, limit: number = 100): Promise<Array<Permission> | undefined> {
		min(skip, 0, 'skip');
		inRange(limit, 1, 100, 'limit');
		return cast<Array<Permission>>(await this.api.get(`/permission/me?skip=${skip}&limit=${limit}`));
	}

	/**
	 * Get a list of permissions
	 * 
	 * @permissions `ciam.permission.list`
	 * @param skip number of permissions to skip
	 * @param limit maximum number of permissions to return
	 * @returns an array of {@link Permission}, or undefined
	 * @throws if {@link skip} is less than 0
	 * @throws if {@link limit} is not in the range 1..100
	 */
	async listPermissions(skip: number = 0, limit: number = 100): Promise<Array<Permission> | undefined> {
		min(skip, 0, 'skip');
		inRange(limit, 1, 100, 'limit');
		return cast<Array<Permission>>(await this.api.get(`/permission/list?skip=${skip}&limit=${limit}`));
	}

	/**
	 * Check a users, or roles permissions
	 * 
	 * @permissions [...`ciam.permission.has.EACH_REQUIRED_FLAG`]
	 * @param type the type of {@link id}
	 * @param id the id of the subject to check permissions for
	 * @param required the required permission flags
	 * @param additional additional flags to give to the subject temporarily
	 * @param includeMissing if the response should include the missing permissions
	 * @returns a {@link CheckResult}, or undefined
	 * @throws if {@link type} is not one of `user`, `role`, or `discordUser`
	 * @throws if {@link type} is `user` or `role` and {@link id} is not a valid objectId
	 * @throws if {@link type} is `discordUser` and {@link id} is not a valid discordId
	 * @throws if {@link required} contains invalid flags
	 * @throws if {@link additional} contains invalid flags
	 */
	async checkPermissions(type: 'user' | 'role' | 'discordUser', id: string, required: Array<string>, additional: Array<string> = [], includeMissing: boolean = false): Promise<CheckResult | undefined> {
		oneOf(type, ['user', 'role', 'discordUser'], 'type');
		if (type == 'user' || type == 'role') objectId(id, 'id');
		else if (type == 'discordUser') discordId(id);
		notEmpty(required, 'required');
		required.forEach(f => flag(f));
		additional?.forEach(f => flag(f));
		return cast<CheckResult>(await this.api.post('/permission/has', {
			type: type,
			id: id,
			required: required,
			additional: additional,
			includeMissing: includeMissing
		}));
	}

	generateAuthUrl(returnUrl: string) {
		return `${this.baseUrl}/login?domain=${this.domain}&returnUrl=${returnUrl}&clientId=${this.self._id}&scope=identify`;
	}

	async getUserFromAuthToken(authToken: string): Promise<User | undefined> {
		return cast<User>(await this.api.get('/auth/user', {
			headers: {
				'ciam_token': authToken
			}
		}));
	}

}

export { Ciam };