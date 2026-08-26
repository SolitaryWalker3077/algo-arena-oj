package com.oj.common.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BaseEntity {
    /**
     * 创建者
     */
    private Long createBy;
    /**
     * 创建时间
     */
    private LocalDateTime createTime;
    /**
     * 更新者
     */
    private Long updateBy;
    /**
     * 更新时间
     */
    private LocalDateTime updateTime;
}
