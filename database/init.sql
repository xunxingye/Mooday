-- Mooday数据库初始化脚本
-- 适用于MySQL 5.7+

-- 创建数据库
CREATE DATABASE IF NOT EXISTS mooday CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE mooday;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '加密后的密码',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建心情记录表
CREATE TABLE IF NOT EXISTS records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT COMMENT '关联的用户ID',
    date DATE NOT NULL COMMENT '记录日期',
    content TEXT NOT NULL COMMENT '状态内容',
    content ENUM('low', 'medium', 'high') NOT NULL COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_date (date),
    INDEX idx_mood (mood),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日心情记录表';


-- 创建用户（如果需要）
-- CREATE USER IF NOT EXISTS 'user'@'localhost' IDENTIFIED BY 'your_secure_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON mooday.* TO 'user'@'localhost';
-- FLUSH PRIVILEGES;

-- 显示表结构
DESCRIBE records;

-- 显示插入的示例数据
SELECT * FROM records ORDER BY date DESC;
