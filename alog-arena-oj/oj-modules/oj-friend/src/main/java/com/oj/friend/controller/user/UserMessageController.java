package com.oj.friend.controller.user;

import com.baomidou.mybatisplus.extension.plugins.pagination.PageDTO;
import com.oj.common.controller.BaseController;
import com.oj.common.entity.PageQueryDto;
import com.oj.common.entity.TableDataInfo;
import com.oj.friend.service.user.IUserMessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@Tag(name = "我的消息")
@RestController
@RequestMapping("/user/message")
public class UserMessageController extends BaseController {

    @Autowired
    private IUserMessageService userMessageService;


    @Operation(summary = "消息列表")
    @GetMapping("/list")
    public TableDataInfo list(PageQueryDto dto) {
        return userMessageService.list(dto);
    }

}
