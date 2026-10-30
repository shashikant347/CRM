import axios from 'axios';
import api from './client';

export const customerChatApi = axios.create({
  baseURL: api.defaults.baseURL,
});
