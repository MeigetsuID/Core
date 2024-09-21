import * as mysql from 'mysql2';
import { promisify } from 'util';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
};
const checkMariaDBConnection = async () => {
    const connection = mysql.createConnection(dbConfig);
    const connect = promisify(connection.connect.bind(connection));
    try {
        await connect();
        connection.end();
    } catch (error) {
        setTimeout(checkMariaDBConnection, 1000); // 1秒ごとに再試行
    }
};
checkMariaDBConnection().then(() => {
    console.log('MariaDB is ready');
});
