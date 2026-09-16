package com.oj.common.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BaseEntity {
    /**
     * 创建者
     */
    @TableField(fill = FieldFill.INSERT)  // @TableField 自动填充字段
    private Long createBy;
    /**
     * 创建时间
     */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    /**
     * 更新者
     */
    @TableField(fill = FieldFill.UPDATE)
    private Long updateBy;
    /**
     * 更新时间
     */
    @TableField(fill = FieldFill.UPDATE)
    private LocalDateTime updateTime;
}
