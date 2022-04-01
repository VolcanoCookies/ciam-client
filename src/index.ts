import axios, { Axios, AxiosError, AxiosResponse } from 'axios';
import 'ciam-commons';

type User = Model.User;
type DiscordUser = Model.DiscordUser;
type Role = Model.Role;
type Permission = Model.Permission;


const idReg: RegExp = /[a-f0-9]{24}/;

function cast<T>(obj: any): T | undefined {
    return obj ? obj as T : undefined;
}

class Ciam {
    token: string;
    baseUrl: string;

    api: Axios;

    constructor(token: string, baseUrl: string = 'https://ciam.centralmind.net') {
        this.token = token;
        this.baseUrl = baseUrl;

        this.api = axios.create({
            baseURL: this.baseUrl,
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        this.api.get('/auth/valid').then(res => {
            if (res.status == 401)
                throw new Error('Invalid CIAM token');
        });

        this.api.interceptors.response.use(function (response) {
            return response;
        }, function (error) {
            if (error.response.status == 401) {
                const message = error.data as string;
                if (message.startsWith('Missing permissions')) {
                    return Promise.reject('message');
                } else {
                    return Promise.reject('Invalid CIAM token');
                }
            }
            if (error.response.status == 404 && error.response.data?.length > 0) {
                return Promise.resolve(undefined);
                return Promise.reject(error.response.data);
            }
            return Promise.reject(error);
        });
    }



    async getUser(id: string): Promise<User | undefined> {
        Check.id(id);
        return cast<User>(await this.api.get(`/user/${id}`));
    }

    async deleteUser(id: string) {
        Check.id(id);
        return cast<Role>(await this.api.delete(`/role/${id}`));
    }

    async createUser(name: string, roles: Array<string>, permissions: Array<string>): Promise<User | undefined> {
        Check.notEmpty(name, 'name');
        const obj = {
            name: name,
            roles: roles,
            permissions: permissions
        };
        return cast<User>(await this.api.post('/user/create', obj));
    }

    async listUsers(): Promise<Array<User> | undefined> {
        return cast<Array<User>>(await this.api.get('/user/list'));
    }

    async getRole(id: string): Promise<Role | undefined> {
        Check.id(id);
        return cast<Role>(await this.api.get(`/role/${id}`));
    }

    async deleteRole(id: string) {
        Check.id(id);
        return cast<Role>(await this.api.delete(`/role/${id}`));
    }

    async createRole(name: string, description: string, permissions: Array<string>): Promise<Role | undefined> {
        Check.notEmpty(name, 'name');
        Check.notEmpty(description, 'description');
        const obj = {
            name: name,
            description: description,
            permissions: permissions
        };
        return cast<Role>(await this.api.post('/role/create', obj));
    }

    async createPermission(name: string, description: string, flag: string): Promise<Permission | undefined> {
        Check.notEmpty(name, 'name');
        Check.notEmpty(description, 'description');
        Check.strictFlag(flag);
        const obj = {
            name: name,
            description: description,
            flag: flag
        };
        return cast<Permission>(await this.api.post('/permission/create', obj));
    }

    async updatePermission(permission: Permission): Promise<Permission | undefined> {
        return cast<Permission>(await this.api.post('/permission/update', permission));
    }

}

export { Ciam };